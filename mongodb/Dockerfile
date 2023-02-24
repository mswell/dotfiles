FROM python:3.12.0a3-slim


WORKDIR /root

RUN apt update && apt install -y libpcap-dev build-essential

COPY . .

RUN pip install -r requirements.txt
