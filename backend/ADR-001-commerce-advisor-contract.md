# ADR: Commerce Advisor Contract and System Extensions

## Context
ShopStream requires an agentic advisor loop to monitor inventory signals and automatically suggest merchandising actions (pricing changes and stock reorders). We need to determine the interface contract for these suggestions: whether to use two separate contracts (one for pricing, one for reorder) or a unified `CommerceAdvisor` contract returning both at once. 

Additionally, the system needs to be designed with future extensibility in mind (Sprint 2 will introduce competitor prices, margin floors, and supplier catalogs).

## Decision
**We have decided to use a unified `CommerceAdvisor` contract that returns both pricing and reorder recommendations in a single response.**

### Rationale: Unified Contract
1. **Holistic Merchandising Context**: Pricing and inventory are deeply coupled. An AI advisor or rule engine evaluating a demand spike must decide whether to increase price (to capture yield) or order more stock (to capture volume), or both. Evaluating them separately deprives the advisor of the ability to make trade-offs between price and stock.
2. **Reduced API Overhead**: Calling the AI (Gemini/LiteLLM) is expensive and slow. A unified contract requires only one API call and one context generation to yield both recommendations, minimizing latency and cost.
3. **Trigger-Specific Prompts**: While the contract is unified, we use different prompts for `INVENTORY_LOW` vs `DEMAND_SPIKE`. This ensures the AI understands the trigger context and returns appropriately tailored unified suggestions.

### Extension Points for Sprint 2
To accommodate upcoming features, we have added the following nullable fields to the `Product` model:
- `costPrice` (`Float?`): Provides a baseline to calculate margin floors.
- `supplierId` (`String?`): Enables integration with supplier catalogs for reordering.

In the future, the `CommerceAdvisor` contract can easily be extended (e.g. `CompetitorAwareStrategy`) by implementing the same interface and registering it, without changing the endpoints or the async agentic loop.

## Consequences
- The AI service must always return both pricing and reorder recommendations. If one is deemed unnecessary, it must still return a valid object (e.g., `direction: "HOLD"` for pricing).
- The prompt engineering must be precise to instruct the LLM on returning both objects in a single structured JSON response.
- The `generateSuggestions` service will split the unified response into two separate `Suggestion` entities in the database, allowing merchandisers to accept/reject them independently.
