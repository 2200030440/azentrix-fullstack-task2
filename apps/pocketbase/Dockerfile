FROM alpine:latest

# Use the exact version matching the project's pocketbase binary
ARG PB_VERSION=0.27.0

RUN apk add --no-cache \
    unzip \
    ca-certificates

# Download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Copy the schemas/migrations/hooks if they exist
COPY ./pb_migrations /pb/pb_migrations
COPY ./pb_hooks /pb/pb_hooks

# Mount persistent volume on /pb/pb_data for DB records
VOLUME /pb/pb_data

EXPOSE 8080

# Start PocketBase on port 8080
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]
