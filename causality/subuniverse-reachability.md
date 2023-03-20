# Subuniverse-Reachability

Dieses Dokument beschreibt das theoretische Problem, dass wir mit dem Causality-Export angehen möchten.

## Problem:

Wenn man aus Projekt $U$ eine Teilmenge der Analyseelemente $P$ herausnimmt, was bleibt dann noch übrig?

### Formal

Sei $\mathcal{U}$ die Menge der möglichen Universen, sprich Java-Projekte, die Native Image als Eingabe kompilieren kann.

Dann definieren wir
$$\text{Reach}: \mathcal{U} \rightarrow \mathcal{U}$$
als Funktion, die die Eingabe auf den laut der Pointsto-Analyse erreichbaren Teil des Java-Projekts abbildet. Da die Analyse bis auf technische Details keinen neuen Code generiert, nehmen wir
$$\text{Reach}(U) \subseteq U : \forall U$$
an.

Wenn wir ein konkretes Eingabeprojekt betrachten, ist das Universum $U$ fest. Wir interessieren uns dann für die Funktion
$$\text{Purged}_U(P) = \text{Reach}(U) \setminus \text{Reach}(U \setminus P).$$
Sie gibt an, welche Teile des Universums nicht mehr von der Analyse erreicht würden, sobald man $P \subset U$ entfernt.

Mit einem zusätzlich gegebenen Kostenmaß
$$\text{cost}: U \rightarrow \mathbb{R}⁺_0$$
kann man dann eine Kostenverringerung durch Entfernen von $P$ bestimmen:
$$\text{PurgeGain}_U(P) = \sum _{u \in \text{Purged}_U(P)} \text{cost}(u)$$

### Motivation

Das Kostenmaß könnte etwa die Codesize einer Methode und die Größe von Heap-Objekten für Konstanten und statische Intializer sein.
Somit bekäme (man eine Abschätzung für) den "Optimierungsdruck", der auf einem definierten Teil des Codes (einzelner Call, einzelne Methode, Klasse, Package, etc.) lastet.

Sowie der skalare Wert "Optimierungsdruck", als auch die konkrete Menge an wegfallenden Elementen eignet sich für eine Visualisierung, die beim Verringern der Imagegröße hilft: In einer Übersicht kann man den Optimierungsdruck pro angezeigtem Element symbolisch enkodieren. Die Menge der wegfallenden Elemente ist eine Detaileigenschaft, die etwa beim Mouse-Over hervorgehoben werden kann.

## Erfassung

### Real

Ein naiver Ansatz, der zumindest aber als Referenz nützlich ist.

Man führt den Native-Image-Prozess aus mit einer Spezialoption, über die man zu ignorierende Analyseelemente angeben kann. Das entstehende Universum vergleicht man mit dem original Aufruf.

Für eine einzige zu entfernende Teilmenge des Universums $P \subset U$ ist das noch durchführbar. Zum Flaschenhals wird hierbei jedoch die Dauer von der Analyse.

### Callgraph

Ein einfacher und schneller Ansatz, der eine sehr grobe Abschätzung von
$$\text{Purged}_{U,\text{Callgraph}}(P) \subseteq \text{Purged}_U(P)$$
liefert. Erkenntnisse aus dem *Reverse Engineering*-Seminar haben gezeigt, dass die verbleibende Information in der Praxis nicht nützlich ist.

Man nimmt dafür den Callgraph, entfernt $P$ und führt eine Breitensuche aus.

Ein weiterer Nachteil ist, dass hier nur Methoden als Analyseelemente betrachtet und für die Imagesize verantwortlich gemacht werden können.

### Causality-Graph

Vorteilhaft ist die Kombination nahe Approximation
$$\text{Purged}_{U,\text{Causality-Graph}}(P) \subseteq \text{Purged}_U(P)$$
, sprich relevanten Ergebnissen, und potenziell um Größenordnungen schnellere Berechnungszeit im Vergleich zum [direkten Erfassen](#real).

Man exportiert aus der Pointsto-Analyse die für die Kausalität der Erreichbarkeit relevanten Informationen, und baut einen Kausalitätsgraphen, den man ebenfalls Offline in einer Art Breitensuche traversieren kann.
Da bei der Analyse einige UND-Zusammenhänge auftreten (z.B. `Integer.toString()` wird reachable weil `Object.toString()` an Stelle X aufgerufen und `Integer` an Stelle X von Stelle Y geflossen kam), bekommt man einen gerichteten Hypergraphen, der zusätzlich zu normalen Kanten noch Kanten mit zwei Eingängen enthält. Dieser Graph wird außerdem im Vergleich zum Callgraph größer.

Um die Kausalität möglichst vollständig zu erfassen, braucht man neben den direkten Methodenaufrufen auch noch Informationen über Typflüsse und daraus resultierenden virtuellen Aufrufen. Die sogenannten Graal-Features können durch ihre Turing-vollständigen Hooks theoretisch zum Problem werden. Praktisch kann man aber annehmen, dass die meisten Features gutartige Paare von Reachability-Callbacks und Reachability-Registrierungen umsetzen.