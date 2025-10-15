import { LLMCache, Message } from './index';

// Exemplo de como usar o LLMCache na sua aplicação.

async function simulateConversation() {
  console.log('--- Iniciando Simulação de Cache de LLM ---');
  
  // 1. Obtenha a instância do Singleton. A URL é necessária apenas na primeira vez.
  const cache = LLMCache.getInstance('http://localhost:3000');
  
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
  const messages: Message[] = [
    { role: 'user', content: 'Olá, qual é a capital de Portugal?', timestamp: Date.now() },
    { role: 'assistant', content: 'A capital de Portugal é Lisboa.', timestamp: Date.now() + 1000 },
    { role: 'user', content: 'E qual é a sua população aproximada?', timestamp: Date.now() + 2000 },
    { role: 'assistant', content: 'A população de Lisboa é de aproximadamente 550.000 habitantes no município.', timestamp: Date.now() + 3000 },
    { role: 'user', content: 'Obrigado!', timestamp: Date.now() + 4000 }
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
  const fullConversation = await cache.getConversationWindow(userId);
  console.log(`Total de mensagens no histórico: ${fullConversation.length}`);
  
  console.log('\n--- Simulação Concluída ---');
}

simulateConversation().catch(console.error); 
