FROM ubuntu:24.04

RUN apt-get update -qq && \
    apt-get install -y -qq \
      bash \
      coreutils \
      grep \
      iproute2 \
      iputils-ping \
      traceroute \
      tcpdump \
      bind9-dnsutils \
      dnsmasq-base \
      netcat-openbsd \
      python3 \
      curl \
      wget \
      iptables \
      procps \
      isc-dhcp-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

CMD ["sleep", "infinity"]
