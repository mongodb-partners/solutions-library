FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user and set permissions for nginx
RUN adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /var/cache/nginx /var/run /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid
USER appuser

EXPOSE 7860

CMD ["nginx", "-g", "daemon off;"]