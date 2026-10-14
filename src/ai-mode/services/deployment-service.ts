import { AIModeDeployment } from '../types';
import { aiModeStorage } from './storage';
import { generateId } from '@/lib/utils';

export class AIModeDeploymentService {
  public static async getDeployments(workspaceId: string): Promise<AIModeDeployment[]> {
    return await aiModeStorage.getDeployments(workspaceId);
  }

  public static async getDeploymentById(id: string): Promise<AIModeDeployment | null> {
    return await aiModeStorage.getDeploymentById(id);
  }

  public static async createDeployment(params: {
    workspaceId: string;
    name: string;
    allowed_domains?: string[];
  }): Promise<AIModeDeployment> {
    const depId = `aim_dep_${generateId('widget')}`;
    const newDep: AIModeDeployment = {
      id: depId,
      workspace_id: params.workspaceId,
      name: params.name,
      status: 'LIVE',
      allowed_domains: params.allowed_domains || ['*'],
      theme: {
        primary_color: '#09090b',
        background_color: '#ffffff',
        text_color: '#09090b',
        border_radius: 'lg',
        font_family: 'Inter, system-ui, sans-serif'
      },
      branding: {
        title: 'AI Shopping Mode',
        subtitle: 'Instant recommendations & product search',
        welcome_message: 'Hi there! 👋 I am in AI Mode. Ask me to find products, compare styles, or recommend items for any occasion.',
        suggested_prompts: [
          'Find formal shirts under ₹2000',
          'Recommend a summer outfit',
          'Compare top rated items'
        ],
        position: 'bottom-right'
      },
      embed_code: `<script src="/api/ai-mode/widget/${depId}/script.js" async defer></script>`,
      total_conversations: 0,
      total_product_clicks: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await aiModeStorage.addDeployment(newDep);
    return newDep;
  }

  public static async updateDeployment(id: string, updates: Partial<AIModeDeployment>, workspaceId?: string): Promise<AIModeDeployment | null> {
    return await aiModeStorage.updateDeployment(id, updates, workspaceId);
  }

  public static async deleteDeployment(id: string, workspaceId?: string): Promise<boolean> {
    return await aiModeStorage.deleteDeployment(id, workspaceId);
  }

  public static generateScriptJs(deployment: AIModeDeployment, hostUrl: string): string {
    const origin = hostUrl || '';
    return `
(function() {
  if (window.__AIModeWidgetLoaded) return;
  window.__AIModeWidgetLoaded = true;

  var config = ${JSON.stringify(deployment)};
  var iframe = document.createElement('iframe');
  iframe.id = 'aimode-widget-frame';
  iframe.src = '${origin}/ai-mode/embed/' + config.id;
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.${deployment.branding.position === 'bottom-left' ? 'left' : 'right'} = '20px';
  iframe.style.width = '380px';
  iframe.style.height = '620px';
  iframe.style.maxHeight = '90vh';
  iframe.style.maxWidth = '90vw';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
  iframe.style.zIndex = '999999';
  iframe.allow = 'clipboard-write';

  document.body.appendChild(iframe);
})();
    `.trim();
  }
}
