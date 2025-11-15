FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir fastapi uvicorn pydantic pydantic-settings redis sqlalchemy psycopg2-binary jinja2 python-multipart
COPY . .
EXPOSE 9200
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "9200"]
