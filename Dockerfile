FROM node:18-alpine AS base

FROM base AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn config set registry 'https://registry.npmmirror.com/'
RUN yarn install

FROM base AS builder

RUN apk update && apk add --no-cache git

ENV OPENAI_API_KEY=""
ENV GOOGLE_API_KEY=""
ENV CODE=""

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

FROM base AS runner
WORKDIR /app

RUN apk add proxychains-ng

ENV PROXY_URL=""
ENV OPENAI_API_KEY=""
ENV GOOGLE_API_KEY=""
ENV CODE=""
ENV QWEN_API_KEY="sk-3c8f0bad536c4d669d26c61c7f7f598b"
ENV QWEN_URL="https://dashscope.aliyuncs.com/"
ENV SPARK_API_KEY="11e6d41c5cb17d4841d93cc3c3944891"
ENV SPARKAPPID="d060186d"
ENV SPARKSECRET="NTQ2NmMyYzdiNGRmZGQ5ZWE5OGZlNWE3"
ENV QIANFANACCESS="7evcvXGDbPkHKKFhLU5pdYfL"
ENV QIANFANSECRET="gpkH4taGFunN5YN1lRjagh6xo4QUXhiE"
ENV MOONSHOTKEY='sk-PgX3aB8eXY57CgklYsbFPbbdq8BelGzMhg1WVTALzbWQSV5F'
ENV MOONSHOT_URL='https://api.moonshot.io/v1'

ENV NEXT_PUBLIC_SUPABASE_URL="https://gyjnuedizsmkyqprgvwt.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5am51ZWRpenNta3lxcHJndnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY1NDM2NjcsImV4cCI6MjAzMjExOTY2N30.ylEcXhQLFerpovKfjRGj5t6rSqgX2Kd6Nhb3xcsjVns"


COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/server ./.next/server

EXPOSE 3000

CMD if [ -n "$PROXY_URL" ]; then \
    export HOSTNAME="127.0.0.1"; \
    protocol=$(echo $PROXY_URL | cut -d: -f1); \
    host=$(echo $PROXY_URL | cut -d/ -f3 | cut -d: -f1); \
    port=$(echo $PROXY_URL | cut -d: -f3); \
    conf=/etc/proxychains.conf; \
    echo "strict_chain" > $conf; \
    echo "proxy_dns" >> $conf; \
    echo "remote_dns_subnet 224" >> $conf; \
    echo "tcp_read_time_out 15000" >> $conf; \
    echo "tcp_connect_time_out 8000" >> $conf; \
    echo "localnet 127.0.0.0/255.0.0.0" >> $conf; \
    echo "localnet ::1/128" >> $conf; \
    echo "[ProxyList]" >> $conf; \
    echo "$protocol $host $port" >> $conf; \
    cat /etc/proxychains.conf; \
    proxychains -f $conf node server.js; \
    else \
    node server.js; \
    fi
