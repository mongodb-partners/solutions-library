FROM python:3.10-slim

COPY requirements.txt /code/requirements.txt
COPY ./main.py /code/main.py
COPY ./images.py /code/images.py
COPY ./logger.py /code/logger.py
COPY ./images/mongo.png ./code/images/mongo.png
COPY ./images/user.png ./code/images/user.png

EXPOSE 7860

WORKDIR /code

RUN pip install -r requirements.txt

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /code
USER appuser

ENTRYPOINT [ "python3", "main.py" ]