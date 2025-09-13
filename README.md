# BebelAI - Sistema de Gestão de Clínica

Sistema de gestão para clínicas médicas com foco no módulo de Pendências.

## 🚀 Funcionalidades

### Módulo de Pendências
- **Kanban Board** com drag & drop
- **3 Colunas**: A Fazer, Fazendo, Feito
- **Sistema de Filtros** por status, tipo e prioridade
- **Busca** por descrição, tipo ou nome do paciente
- **Modal de Edição** para criar/editar pendências
- **Dados Mockados** para demonstração

## 🛠️ Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **@dnd-kit** - Drag & drop
- **React Hook Form** - Formulários
- **Zod** - Validação de esquemas

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/leandro-2112/bebel-ai-webapp.git
cd bebel-ai-webapp
```

2. Navegue para a pasta do projeto:
```bash
cd bebel-webapp
```

3. Instale as dependências:
```bash
npm install
```

4. Execute o projeto:
```bash
npm run dev
```

5. Acesse no navegador:
```
http://localhost:3000
```

## 📁 Estrutura do Projeto

```
bebel-webapp/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Layout do dashboard
│   │   │   ├── page.tsx             # Página inicial do dashboard
│   │   │   └── pendencias/
│   │   │       └── page.tsx         # Página do módulo de pendências
│   │   ├── layout.tsx               # Layout global
│   │   └── page.tsx                 # Página inicial (redireciona)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-header.tsx       # Cabeçalho da aplicação
│   │   │   └── app-sidebar.tsx      # Menu lateral
│   │   ├── pendencias/
│   │   │   ├── kanban-board.tsx     # Componente do Kanban Board
│   │   │   ├── kanban-column.tsx    # Coluna do Kanban
│   │   │   ├── pendencia-card.tsx   # Card de pendência
│   │   │   ├── pendencia-modal.tsx  # Modal de edição
│   │   │   └── pendencias-filters.tsx # Filtros
│   │   └── ui/                      # Componentes UI (shadcn)
│   └── lib/
│       ├── types.ts                 # Tipos TypeScript
│       └── mock-data.ts             # Dados mockados
```

## 🎯 Como Usar

### Navegação
- Use o menu lateral para navegar entre módulos
- Clique no ícone de menu para colapsar/expandir a sidebar

### Módulo de Pendências
1. **Visualizar**: As pendências são organizadas em 3 colunas
2. **Mover**: Arraste os cards entre as colunas
3. **Filtrar**: Use os filtros no topo da página
4. **Buscar**: Digite no campo de busca
5. **Editar**: Clique em um card para editar
6. **Criar**: Clique em "Nova Pendência"

### Tipos de Pendência
- **Agendamento**: Solicitações de consulta
- **Orçamento**: Pedidos de orçamento
- **Pagamento**: Questões financeiras
- **Informação**: Solicitações gerais
- **Cancelamento**: Pedidos de cancelamento

### Prioridades
- **1**: Muito Baixa (cinza)
- **2**: Baixa (azul)
- **3**: Média (amarelo)
- **4**: Alta (laranja)
- **5**: Muito Alta (vermelho)

## 🔮 Próximos Módulos

- **Dashboard**: Visão geral e métricas
- **Conversas**: Gerenciamento de conversas
- **Agenda**: Sistema de agendamento

## 📝 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Desenvolvedor

Desenvolvido por **Leandro** com assistência da **Cascade AI**.
