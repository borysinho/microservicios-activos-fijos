import { readFileSync } from 'fs';
import { resolve } from 'path';

type N8nNode = {
  name: string;
  type: string;
  webhookId?: string;
  parameters: Record<string, any>;
};

describe('Workflow MS4 solicitud revision', () => {
  const workflowPath = resolve(
    __dirname,
    '../../../ms4/n8n-workflows/flujo_01_solicitud_revision.json',
  );
  const workflow = JSON.parse(readFileSync(workflowPath, 'utf8')) as {
    active: boolean;
    settings?: Record<string, any>;
    nodes: N8nNode[];
  };

  function node(name: string): N8nNode {
    const found = workflow.nodes.find((item) => item.name === name);
    if (!found) {
      throw new Error(`Nodo ${name} no encontrado`);
    }
    return found;
  }

  it('expone el webhook productivo que MS3 dispara en MS4', () => {
    const trigger = node('WhatsApp Trigger');

    expect(workflow.active).toBe(true);
    expect(workflow.settings).toMatchObject({ executionOrder: 'v1' });
    expect(trigger.webhookId).toBe('ms4');
    expect(trigger.type).toBe('n8n-nodes-base.webhook');
    expect(trigger.parameters).toMatchObject({
      path: 'solicitud-revision',
      httpMethod: 'POST',
      responseMode: 'onReceived',
    });
  });

  it('normaliza payloads de MS3 aunque N8N los entregue en body', () => {
    const code = String(node('Extraer Codigo Activo').parameters.jsCode);

    expect(code).toContain('$json.body || $json');
    expect(code).toContain('data.text || data.Body');
    expect(code).toContain('data.from || data.From');
    expect(code).toContain('data.MessageSid || data.SmsMessageSid');
    expect(code).toContain('codigoActivo');
  });

  it('usa MS3 como fachada del sistema y responde al numero normalizado', () => {
    expect(String(node('Crear Solicitud via MS3').parameters.url)).toContain(
      '/webhooks/solicitud-revision',
    );
    expect(String(node('Crear Solicitud via MS3').parameters.url)).toContain(
      'codigoActivo',
    );
    expect(String(node('Responder WhatsApp').parameters.url)).toContain(
      "$('Crear Solicitud via MS3').item.json.from",
    );
  });
});
