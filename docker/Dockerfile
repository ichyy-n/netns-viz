FROM ubuntu:24.04

RUN apt-get update -qq && \
    apt-get install -y -qq iproute2 iputils-ping traceroute tcpdump net-tools curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

CMD ["sleep", "infinity"]