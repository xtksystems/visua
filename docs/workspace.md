# Using the workspace

The Visua workspace brings program health, tasks, evidence, and framework
relationships into one place. This guide shows where to find the next action
and what to expect when you make a change.

## Find a destination

The labeled sidebar groups destinations by purpose. **Workspace** contains
**Overview**, **Action plan**, **Evidence**, **Agents**, **Policies**, and
**Reports & trust**. **Explore** contains the Observatory, Crosswalk nexus,
and framework programs. **Manage** contains organization and workspace
settings.

Use search in the top bar, or press `⌘K` on macOS or `Ctrl+K` on Windows and
Linux, to find requirements or ask the copilot. On screens narrower than 1024
pixels, open the labeled menu from the top bar.

## Review program health

**Overview** shows readiness for the primary framework, open gaps, evidence
coverage, and decisions awaiting approval. Framework cards show readiness,
status distribution, scope, and evidence coverage. Choose **Program** to open
the framework's 2D view or **View in 3D** to explore it in the Observatory.

![Overview with labeled navigation, program metrics, and framework cards](images/home.jpg)

Use **Next best actions** to open a requirement that needs work. If agent
drafts are waiting, the approval panel links to the review queue. While the
overview loads, placeholders show where its content will appear.

## Move work forward

**Action plan** offers a board and a timeline. The board keeps all six task
statuses visible in groups of three columns on typical desktop screens and
stacks them on a phone. The framework filter narrows both views. The
**Generate plan** action always uses the workspace's primary framework.

1. Use **Generate plan** to create tasks from official implementation
   guidance for the primary framework, or use **Plan with agent** to request
   a proposed plan.
2. Enter a title in **Quick add a task**, then select **Add task** to create
   it in **To do**.
3. Open a card to review its checklist, status, dates, assignee, and linked
   requirements. You can change its status in the task details.
4. On the board, drag a card to another status when you want to move it. The
   card moves immediately and shows **Saving…** until the server responds.

A card cannot be dragged again while its move is saving. If the save fails,
the card returns to its previous status and an error message appears. A
successful move remains in place while the workspace refreshes.

## Explore requirements and mappings

**Observatory** shows framework requirements as a spatial map. Open a
requirement to inspect its status, evidence, and tasks. Its 2D outline gives
you the same path through the framework; on a phone, the outline opens first
and the 3D scene is one tap away.

**Crosswalk nexus** shows how groups in different frameworks relate. Select a
group to hide unrelated links and see its mappings in the detail panel. The
searchable group list provides a 2D path through the same information. The
inner threat ring shows published links from threat catalogs to requirement
groups. A mapping suggests where work may apply; each requirement still needs
its own evidence.

![Selected Nexus threat showing its linked groups and mapping details](images/nexus-threat-ring.jpg)

For implementation details, see the [web architecture](architecture.md#5-web-appsweb)
and the [design system](../DESIGN.md).
