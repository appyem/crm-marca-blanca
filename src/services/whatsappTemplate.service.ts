// src/services/whatsappTemplate.service.ts

import {
  WhatsAppTemplate,
  WhatsAppTemplateDocument,
  MetaTemplatesListResponse,
  TemplateComponent,
  TemplateVariable,
  SyncResult,
} from '@/types/whatsappTemplate.types';

const META_GRAPH_API_VERSION = 'v19.0';
const META_GRAPH_API_URL = 'https://graph.facebook.com';

// ==========================================
// UTILIDADES DE PARSEO
// ==========================================

/**
 * Extrae variables {{1}}, {{2}} del texto y devuelve una lista con ejemplos.
 */
function extractVariablesFromText(
  text: string,
  location: 'header' | 'body',
  exampleValues: string[] = []
): TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const regex = /\{\{(\d+)\}\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const index = parseInt(match[1], 10);
    const existingVar = variables.find(v => v.index === index);
    
    if (!existingVar) {
      variables.push({
        index,
        name: `var${index}`,
        example: exampleValues[index - 1] || `[variable ${index}]`,
        location,
      });
    }
  }

  return variables;
}

/**
 * Convierte los componentes de Meta a una estructura procesada.
 * Extrae variables automáticamente del header y body.
 */
function parseTemplateComponents(components: TemplateComponent[]): {
  variables: TemplateVariable[];
  previewText: string;
  headerText?: string;
  footerText?: string;
  hasButtons: boolean;
} {
  const allVariables: TemplateVariable[] = [];
  let previewText = '';
  let headerText: string | undefined;
  let footerText: string | undefined;
  let hasButtons = false;

  for (const component of components) {
    if (component.type === 'HEADER' && component.format === 'TEXT' && component.text) {
      headerText = component.text;
      if (component.example?.header_text) {
        allVariables.push(
          ...extractVariablesFromText(component.text, 'header', component.example.header_text)
        );
      }
    }

    if (component.type === 'BODY' && component.text) {
      previewText = component.text;
      if (component.example?.body_text?.[0]) {
        allVariables.push(
          ...extractVariablesFromText(component.text, 'body', component.example.body_text[0])
        );
      }
    }

    if (component.type === 'FOOTER' && component.text) {
      footerText = component.text;
    }

    if (component.type === 'BUTTONS' && component.buttons && component.buttons.length > 0) {
      hasButtons = true;
    }
  }

  // Ordenar variables por índice
  allVariables.sort((a, b) => a.index - b.index);

  return {
    variables: allVariables,
    previewText,
    headerText,
    footerText,
    hasButtons,
  };
}

/**
 * Convierte la respuesta de Meta en un documento listo para Firestore.
 */
function metaTemplateToDocument(template: {
  id: string;
  name: string;
  status: WhatsAppTemplate['status'];
  category: WhatsAppTemplate['category'];
  language: string;
  components: TemplateComponent[];
}): WhatsAppTemplateDocument {
  const parsed = parseTemplateComponents(template.components);
  const now = new Date().toISOString();

  return {
    metaTemplateId: template.id,
    name: template.name,
    status: template.status,
    category: template.category,
    language: template.language,
    components: template.components,
    variables: parsed.variables,
    previewText: parsed.previewText,
    headerText: parsed.headerText,
    footerText: parsed.footerText,
    hasButtons: parsed.hasButtons,
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: now,
  };
}

// ==========================================
// SERVICIO PRINCIPAL (uso del lado servidor)
// ==========================================
export const whatsappTemplateService = {
  /**
   * Obtiene todas las plantillas de Meta Business API.
   * Requiere WHATSAPP_TOKEN y WHATSAPP_BUSINESS_ACCOUNT_ID en env.
   */
  async fetchTemplatesFromMeta(): Promise<WhatsAppTemplateDocument[]> {
    const token = process.env.WHATSAPP_TOKEN;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!token) {
      throw new Error('WHATSAPP_TOKEN no está configurado.');
    }
    if (!wabaId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID no está configurado.');
    }

    const url = `${META_GRAPH_API_URL}/${META_GRAPH_API_VERSION}/${wabaId}/message_templates?limit=250`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error de Meta API (${response.status}): ${errorBody}`);
    }

    const result: MetaTemplatesListResponse = await response.json();

    return result.data.map(metaTemplateToDocument);
  },
};