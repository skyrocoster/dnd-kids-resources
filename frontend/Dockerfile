FROM node:24-slim
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci \
    && sha256sum package-lock.json > node_modules/.package-lock.sha256 \
    && mkdir -p /opt/frontend-node-modules \
    && cp -a node_modules/. /opt/frontend-node-modules/
COPY frontend/docker-entrypoint.sh /usr/local/bin/dnd-frontend-entrypoint
RUN chmod +x /usr/local/bin/dnd-frontend-entrypoint
ENTRYPOINT ["dnd-frontend-entrypoint"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
