FROM python:3.10-slim

COPY ./requirements.txt /code/requirements.txt
COPY ./main.py /code/main.py

# Set up working directory
WORKDIR /code

RUN pip install -r requirements.txt

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /code
USER appuser

EXPOSE 8181
ENTRYPOINT [ "python3", "main.py" ]