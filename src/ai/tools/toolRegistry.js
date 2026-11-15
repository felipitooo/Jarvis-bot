const { ValidationError, PermissionDeniedError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');

const toolLogger = logger.forContext('ToolRegistry');

class MissingParameterError extends ValidationError {
  constructor(missingParams, toolName) {
    super(`Parâmetro(s) obrigatório(s) ausente(s) para a ferramenta "${toolName}": ${missingParams.join(', ')}.`);
    this.missingParams = missingParams;
    this.toolName = toolName;
  }
}

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Registers a tool into the catalog.
   */
  register(tool) {
    if (!tool.name || typeof tool.execute !== 'function') {
      throw new Error('Tool must have a "name" and an "execute" function.');
    }

    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters || { type: 'OBJECT', properties: {}, required: [] },
      requiredPermission: tool.requiredPermission || null,
      riskLevel: tool.riskLevel || 'LOW',
      requiresConfirmation: Boolean(tool.requiresConfirmation),
      execute: tool.execute
    });

    toolLogger.debug(`Tool registered: ${tool.name} (Risk: ${tool.riskLevel || 'LOW'})`);
  }

  get(name) {
    return this.tools.get(name);
  }

  has(name) {
    return this.tools.has(name);
  }

  getAll() {
    return Array.from(this.tools.values());
  }

  getToolsSchema() {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  /**
   * Validates parameters against tool schema.
   */
  validateArgs(tool, args = {}) {
    const required = tool.parameters?.required || [];
    const missing = [];

    for (const reqKey of required) {
      if (args[reqKey] === undefined || args[reqKey] === null || (typeof args[reqKey] === 'string' && args[reqKey].trim() === '')) {
        missing.push(reqKey);
      }
    }

    if (missing.length > 0) {
      throw new MissingParameterError(missing, tool.name);
    }

    return true;
  }

  /**
   * Executes a tool with parameter validation and permission checks.
   */
  async execute(name, args = {}, context = {}) {
    const tool = this.get(name);
    if (!tool) {
      throw new ValidationError(`Ferramenta desconhecida: "${name}".`);
    }

    // 1. Validate parameters
    this.validateArgs(tool, args);

    // 2. Permission check
    if (tool.requiredPermission && context.member && context.permissionService) {
      const hasPerm = context.permissionService.hasPermission(context.member, tool.requiredPermission);
      if (!hasPerm) {
        throw new PermissionDeniedError(
          `Você não possui permissão suficiente para executar a ação "${tool.name}". Permissão necessária: ${tool.requiredPermission}.`
        );
      }
    }

    // 3. Audit high-risk operations
    if (context.auditService && (tool.riskLevel === 'MEDIUM' || tool.riskLevel === 'HIGH')) {
      context.auditService.logAction({
        guildId: context.guildId || null,
        actorId: context.user?.id || null,
        action: `TOOL_EXECUTION_${tool.name.toUpperCase()}`,
        details: { args, riskLevel: tool.riskLevel }
      });
    }

    toolLogger.info(`Executing tool "${name}"`, {
      userId: context.user?.id,
      guildId: context.guildId,
      riskLevel: tool.riskLevel
    });

    return await tool.execute(args, context);
  }
}

const defaultToolRegistry = new ToolRegistry();

module.exports = {
  ToolRegistry,
  MissingParameterError,
  toolRegistry: defaultToolRegistry
};
