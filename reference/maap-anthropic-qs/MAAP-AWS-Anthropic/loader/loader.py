import ipaddress
import re
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse

from langchain_unstructured import UnstructuredLoader
from unstructured.cleaners.core import clean_extra_whitespace
from typing import List
from langchain_core.documents import Document
from logger import AsyncRemoteLogger


def is_safe_url(url: str) -> tuple[bool, str]:
    """
    Validate URL to prevent SSRF attacks.
    Returns (is_safe, error_message).
    """
    try:
        parsed = urlparse(url)

        # Only allow http and https schemes
        if parsed.scheme not in ('http', 'https'):
            return False, f"Invalid scheme: {parsed.scheme}. Only http/https allowed."

        # Require a hostname
        if not parsed.hostname:
            return False, "No hostname provided"

        hostname = parsed.hostname.lower()

        # Block localhost variants
        if hostname in ('localhost', '127.0.0.1', '::1', '0.0.0.0'):
            return False, "Localhost URLs not allowed"

        # Block internal Docker hostnames
        internal_hosts = [
            'anthropic-logger', 'anthropic-main', 'anthropic-loader',
            'anthropic-ui', 'anthropic-nginx', 'mongodb', 'mongo'
        ]
        if hostname in internal_hosts:
            return False, f"Internal service hostname not allowed: {hostname}"

        # Resolve hostname to IP and check for internal IPs
        try:
            ip_addresses = socket.getaddrinfo(hostname, None)
            for addr_info in ip_addresses:
                ip_str = addr_info[4][0]
                ip = ipaddress.ip_address(ip_str)

                # Block private IPs (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
                if ip.is_private:
                    return False, f"Private IP addresses not allowed: {ip_str}"

                # Block loopback (127.x.x.x)
                if ip.is_loopback:
                    return False, f"Loopback addresses not allowed: {ip_str}"

                # Block link-local (169.254.x.x - AWS metadata endpoint)
                if ip.is_link_local:
                    return False, f"Link-local addresses not allowed: {ip_str}"

                # Block reserved addresses
                if ip.is_reserved:
                    return False, f"Reserved addresses not allowed: {ip_str}"

        except socket.gaierror:
            return False, f"Could not resolve hostname: {hostname}"

        return True, ""

    except Exception as e:
        return False, f"URL validation error: {str(e)}"

# Create an instance of the logger
logger = AsyncRemoteLogger(
    service_url="http://anthropic-logger:8181", app_name="MAAP-AWS-Anthropic-Loader"
)


def LoadFiles(file_names: List[str], userId) -> List[Document]:
    loader = UnstructuredLoader(
        file_path=file_names,
        post_processors=[clean_extra_whitespace],
        chunking_strategy="basic",
        max_characters=10000,
        include_orig_elements=False,
        strategy="hi_res",
    )

    docs = loader.load()

    logger.print("Number of LangChain documents in Files:", len(docs))

    for doc in docs:
        doc.metadata["userId"] = userId
        doc.metadata["created_at"] = datetime.now(timezone.utc)

        logger.print(str(doc))
        logger.print(str(doc.metadata))
        logger.print(
            "Length of text in the file document:", len(doc.page_content)
        )
    # asyncio.sleep(5) # wait for search index build
    return docs


def LoadWeb(urls: List[str], userId) -> List[Document]:
    """
    Load web content from URLs with SSRF protection.
    URLs are validated before fetching to prevent access to internal resources.
    """
    docs = []
    skipped_urls = []
    logger.print(str(urls))

    if len(urls) > 0:
        for url in urls:
            # Validate URL to prevent SSRF
            is_safe, error_msg = is_safe_url(url)
            if not is_safe:
                logger.print(f"SSRF Protection: Skipping unsafe URL '{url}': {error_msg}")
                skipped_urls.append({"url": url, "reason": error_msg})
                continue

            try:
                loader = UnstructuredLoader(
                    web_url=url,
                    post_processors=[clean_extra_whitespace],
                    chunking_strategy="basic",
                    max_characters=10000,
                    include_orig_elements=False,
                    strategy="hi_res",
                )
                docs.extend(loader.load())
            except Exception as e:
                logger.print(f"Error loading URL '{url}': {str(e)}")
                skipped_urls.append({"url": url, "reason": str(e)})
                continue

        logger.print("Number of LangChain documents in Web Urls:", len(docs))
        if skipped_urls:
            logger.print(f"Skipped {len(skipped_urls)} URLs due to validation/errors: {skipped_urls}")

        for doc in docs:
            doc.metadata["userId"] = userId
            doc.metadata["created_at"] = datetime.now(timezone.utc)
            logger.print(str(doc))
            logger.print(str(doc.metadata))
            logger.print(
                "Length of text in the web document:", len(doc.page_content)
            )
    # asyncio.sleep(5) # wait for search index build
    return docs
