# gitnexus/hypergraph

## hypergraph (sprint)

```json

Hypergraph's most transplantable ideas into GitNexus are:

gotcha nodes: add a <gotcha> section to wiki prompt. Surfacing failure modes limits the LLM defects in the call graph.

pattern nodes: label cross-community processes as patterns to establish where to apply what.

scan description: add one-sentence retrieval-filters to Process nodes, not just clusters.

Wiki prose: upgrade wiki prompts to embed [wiki links] in justification sentences, not bare bullets.

MOC entry point: replace the flat YAML context resource with a MOC-page that maps cluster-prose and open questions.

concept abstraction: explicitly extract architectural intent from the module call-graph.
```

## chat view (sprint)

```json
export conversation

mermaid diagram copy button actually copies the diagram 

copy paste buttons on the artifacts generated

copy paste buttons at the end of each response 

chat history
```

```json
The 3 highest-value transfers from Hypergraph → GitNexus are:

Typed node schema (MOC/Concept/Pattern/Gotcha) — GitNexus has the graph data, just needs classification in its wiki prompts
Wikilink-woven prose — makes the wiki a traversable agent graph, not just documentation
Gotcha nodes from structural analysis — GitNexus can generate better gotchas than Hypergraph because it has real code graph data (low-confidence edges, high-betweenness hotspots, cross-cluster process chains)
All three are prompt engineering changes to 
gitnexus/src/core/wiki/prompts.ts
 — no new infrastructure needed.
```