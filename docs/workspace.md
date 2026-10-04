# Using the workspace

The Visua workspace brings program health, tasks, evidence, and framework
relationships into one place. This guide shows where to find the next action
and what to expect when you make a change.

## Find a destination

The labeled sidebar groups destinations by purpose. **Workspace** contains
**Overview**, **My work**, **Action plan**, **Evidence**, **Agents**, **Policies**, and
**Reports & trust**. **Explore** contains the Observatory, Crosswalk nexus,
and framework programs. **Manage** contains organization and workspace
settings.

Use search in the top bar, or press `⌘K` on macOS or `Ctrl+K` on Windows and
Linux, to find requirements and read official passages. Contributors and above
can also ask the copilot. On screens narrower than 1024
pixels, open the labeled menu from the top bar.

## Use your role's controls

Viewers can browse requirements, tasks, evidence, policies, and program settings.
Auditors can also export workspace records. Contributors can change work and run
agents or existing connectors. Approvers can also make review, applicability,
and authorization decisions. Admins and owners configure workspaces and add
connectors. Organization administration follows your organization role.

Controls for changes your role cannot make are hidden or disabled. Viewing,
navigation, search, and filters remain available. If a change fails, an error
message appears and its unsaved input remains available to correct or retry.

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
   requirements. Choose an organization member in **Assignee**, set **Due date**,
   and search for requirements to add or remove. Choose **Save task details** to record
   these changes or **Cancel task changes** to discard them. Status and checklist
   changes save individually.
4. On the board, drag a card to another status when you want to move it. The
   card moves immediately and shows **Saving…** until the server responds.

A card cannot be dragged again while its move is saving. If the save fails,
the card returns to its previous status and an error message appears. A
successful move remains in place while the workspace refreshes.

## Find your assigned work

**My work** lists tasks and requirements assigned to your signed-in member
identity in the current workspace. Tasks show status, due dates, and requirement
links. Open a task to work its checklist or edit its details. Requirement code
links open the matching framework and inspector. Calendar due dates remain due through the UTC day. Overdue dates have a text
label, and you can include completed tasks in the list.

Choose a member from **Assign owner** in a requirement inspector, then choose
**Save owner**. Set **Requirement due date** and choose **Save due date**. These
fields save separately. Leaving a field doesn't save it; changing the selection
resets unsaved drafts. Members with read-only roles can see their assigned work
and follow its links.

For a consultant or team without an account, choose **External owner** and
enter a label. External labels don't grant access and don't appear in anyone's
**My work** list. You can later replace the label with a member assignment.
Existing owner labels and old task assignments remain visible. A legacy or
former-member task assignment must be cleared or replaced with a current member
before it can be assigned again.

## Review evidence

Contributors and above can add a file from **Evidence**. To upload an artifact:

1. Choose **Upload evidence**, then select a nonempty file. The file size limit
   is 10 MiB.
2. Enter the title, optional description, kind, and collection date. Set
   **Valid until** if the artifact expires, or leave it blank for no expiry.
3. Link at least one requirement from an enabled framework.
4. Choose **Upload for review**. Visua verifies storage before adding the item
   as **Pending review** and opening its detail dialog. A failed upload keeps
   your draft and displays an error.

Open **Evidence** and select an item to inspect its artifact, source, linked
requirements, collection date, expiry, and review history. For an uploaded file,
the dialog shows its name, byte size, media type, and SHA-256. Choose
**Download file** to inspect it locally. Downloads check the stored size and
hash and require current workspace access. Files download as attachments.
An approver can accept or reject pending evidence from the detail dialog. If
the artifact or its assurance scope changes while you review it, reload the
item before making the decision. Use **Reload evidence** after a stale-detail
error. Missing or corrupt
file bytes block both download and review; the server verifies size and hash
again before recording a file decision.

Acceptance covers a specific artifact hash, requirement list, and validity
window. Changing content, structured data, requirement links, collection date,
or expiry returns the item to **Pending review** and keeps earlier decisions.
Changing its title, description, or file name preserves approval. Uploaded file
bytes and storage references are immutable; upload a new item to replace a
file. A connector's raw observation cannot be edited; run the connector again
to collect a new one.

The ledger counts accepted evidence only while its bound approval and dates are
currently valid. Expired evidence keeps its review history. An upgrade returns
legacy approvals to review because their original assurance scope was not
recorded. Legacy decisions remain visible in the item's history. The later
metadata/body storage migration preserves existing review decisions and audit
history.

## Explore requirements and mappings

**Observatory** shows framework requirements as a spatial map. Open a
requirement to inspect its status, evidence, and tasks. Its 2D outline gives
you the same path through the framework; on a phone, the outline opens first
and the 3D scene is one tap away.

Tab to the selected outline row or the framework canvas before using scene
shortcuts. Arrow keys move between siblings, **Enter** opens the first child,
and **Backspace** or **Escape** moves to the parent. Press **/** to focus the
outline filter, **F** to frame the selection, or **L** to change lenses. These
shortcuts leave inspector fields, buttons, and open dialogs alone. Filtering
keeps your selection and limits tree navigation to visible matches.

Use **Left** and **Right** to change inspector tabs, or **Home** and **End** to
reach the first and last tab. **Tab** moves into the selected panel. Dialogs
keep focus inside while open; closing one restores the control that opened it.
**Escape** in a scope dialog closes the dialog and keeps your requirement
selected.

Requirement code links open the matching framework and selected requirement.
Press **Ctrl+K** or **Cmd+K** to open search, use **Up** and **Down** to choose a
result, and press **Enter** to follow it. Close an open decision dialog before
opening search.

Choose a member in **Assign owner**, or enter an external **Owner** label, then
choose **Save owner** to record it or **Cancel owner
change** to restore the saved value. Leaving the field does not save it.
Selecting another requirement resets inspector drafts, tabs, and dialogs.
A failed owner save keeps your draft; an update to the same requirement does
not replace a dirty owner field.

Workspace and requirement load failures retain their destination and offer
**Retry**. Requirement deep links remain available when details fail to load
and when you follow a mapping into another framework. Closing the inspector
removes its selection from the URL.

**Crosswalk nexus** shows how groups in different frameworks relate. Select a
group to hide unrelated links and see its mappings in the detail panel. The
opening view summarizes connections between frameworks; selecting a group
shows its individual connections. Solid, dashed, densely dotted, and sparsely
dotted threat links indicate final, draft, unreviewed, and superseded sources. The
searchable group list provides a 2D path through the same information. The
inner threat ring shows published links from threat catalogs to requirement
groups. A mapping suggests where work may apply; each requirement still needs
its own evidence.

![Selected Nexus threat showing its linked groups and mapping details](images/nexus-threat-ring.jpg)

For implementation details, see the [web architecture](architecture.md#5-web-appsweb)
and the [design system](../DESIGN.md).
