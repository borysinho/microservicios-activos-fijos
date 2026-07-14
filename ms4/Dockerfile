FROM n8nio/n8n:1.70.3

USER root
COPY n8n-workflows /workflows
COPY scripts/start.sh /usr/local/bin/ms4-start.sh
COPY scripts/dedupe-workflows.js /usr/local/bin/ms4-dedupe-workflows.js
RUN chmod +x /usr/local/bin/ms4-start.sh /usr/local/bin/ms4-dedupe-workflows.js

USER node
EXPOSE 5678
ENTRYPOINT ["tini", "--", "ms4-start.sh"]
