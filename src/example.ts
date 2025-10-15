import { ConversationMetadata, LLMCache, Message, MessageInput } from './index';

// Exemplo de como usar o LLMCache na sua aplicação.

async function simulateConversation() {
  console.log('--- Iniciando Simulação de Cache de LLM ---');
  
  // 1. Obtenha a instância do Singleton. A URL é necessária apenas na primeira vez.
  const cache = LLMCache.getInstance({
    baseURL: 'http://localhost:3000',
    conversationTTLSeconds: 60 * 60, // 1 hora de histórico por utilizador
  });
  
  const userId = `user_${Date.now()}`; // ID de utilizador único para esta simulação
  
  console.log(`\nUtilizador: ${userId}`);
  
  // 2. Limpar qualquer histórico anterior (bom para testes)
  await cache.clearHistory(userId);
  console.log('Histórico anterior limpo.');
  
  // 3. Configurar o modelo para este utilizador
  await cache.setModel(userId, 'gemini-1.5-pro-latest');
  const model = await cache.getModel(userId);
  console.log(`Modelo configurado: ${model}`);
  
  // 4. Adicionar mensagens à conversação
  console.log('\nAdicionando mensagens ao histórico...');
  const messages: MessageInput[] = [
    {
      role: 'user',
      content: 'Olá, qual é a capital de Portugal?',
      metadata: { latencyMs: 120, tokenUsage: { promptTokens: 12 } },
    },
    {
      role: 'assistant',
      content: 'A capital de Portugal é Lisboa.',
      metadata: { latencyMs: 320, tokenUsage: { completionTokens: 18 } },
    },
    { role: 'user', content: 'E qual é a sua população aproximada?' },
    {
      role: 'assistant',
      content: 'A população de Lisboa é de aproximadamente 550.000 habitantes no município.',
      metadata: {
        tokenUsage: { completionTokens: 32 },
        toolCalls: [
          { id: 'geo-1', type: 'function', name: 'lookupCity', arguments: '{"name":"Lisboa"}' },
        ],
      },
    },
    { role: 'user', content: 'Obrigado!' },
  ];
  
  for (const msg of messages) {
    await cache.addMessage(userId, msg);
  }
  console.log(`${messages.length} mensagens adicionadas.`);
  
  // 5. Obter uma janela da conversação (as 2 últimas mensagens)
  console.log('\nObtendo as 2 últimas mensagens (janela de contexto)...');
  const contextWindow = await cache.getConversationWindow(userId, { lastN: 2 });
  console.log(contextWindow);
  
  // 6. Obter a conversação completa
  console.log('\nObtendo a conversação completa...');
  const fullConversation: Message[] = await cache.getConversationWindow(userId);
  console.log(`Total de mensagens no histórico: ${fullConversation.length}`);

  // 7. Guardar metadados agregados sobre a conversa
  console.log('\nActualizando metadados da conversação...');
  const metadata: Partial<ConversationMetadata> = {
    summary: 'Utilizador pergunta factos sobre Lisboa e agradece.',
    totalTurns: fullConversation.length,
    lastInteractionAt: Date.now(),
    tokenUsage: { totalTokens: 62 },
    userPreferences: { language: 'pt-PT' },
  };

  const mergedMetadata = await cache.upsertConversationMetadata(userId, metadata);
  console.log('Metadados guardados:', mergedMetadata);

  const storedMetadata = await cache.getConversationMetadata(userId);
  console.log('Metadados recuperados:', storedMetadata);

  console.log('\n--- Simulação Concluída ---');
}

simulateConversation().catch(console.error); 
