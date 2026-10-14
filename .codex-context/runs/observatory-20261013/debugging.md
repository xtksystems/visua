# Observatory verification findings

The first focused lane passed 11 of 12 cases. The new phone fixture used only
a narrow viewport, but `PHONE` requires a coarse pointer. Its snapshot showed
the canvas and no outline legend. Adding `isMobile: true, hasTouch: true`
exercised the phone branch and passed, including selected row above sheet.
No product change was required for that failure.

Independent review identified lost focus after inspector sibling/path navigation.
The new regression failed after Next sibling: PR.AA-02 details loaded but its
Next sibling button was inactive. The keyed inspector observer had unmounted
the focused button. The page now records only explicit navigation focus requests
and restores the corresponding control across loading/detail header mounts,
falling back to the selected path control at a sibling boundary. Workspace/node
changes and leaving the navigation clear stale requests; other form focus is
never taken. The repeated peer/parent browser regression passed.

The focus restoration regression passed. A subsequent keyboard case exposed
rapid URL composition: both selection assertions reached PR.AA-02, then typing
a new filter restored PR.AA-01. Filter updates used React Router render params
that could trail history. A route-only selection trial prevented this but broke
immediate blank-canvas click + arrow because scene selection had not cleared.
That trial was rejected. Current writes retain immediate scene selection and
compose query edits from the address bar; stale route-render effects are ignored.
All 13 focused cases then passed, followed by all 123 cases in the full browser suite (11.0 minutes).


The bounded review follow-up found one residual cancellation edge: plain-text
clicks blur with no related target. A browser reproduction clicked the inspector
code label, confirmed body focus, then changed another requirement through the
API. The resulting assessment refresh returned focus to the old sibling button.
The regression failed at the final body-focus assertion. The blur handler now
cancels the request for null/non-Node related targets as well as focus outside
the navigation. This retains the existing keyed loading/detail remount behavior.
The blur regression and 11 other affected cases passed; the final typecheck passed. The full
suite's source snapshot is preserved separately from this two-file correction.


The remaining keyboard failure was different from the earlier URL race: the
selection and URL both remained PR.AA-02, but focus was back on the filter after
Tab. The trace shows a second slash shortcut followed by rapid search and Tab.
The existing handler always scheduled requestAnimationFrame focus, even when the
input was mounted. That delayed request could displace subsequent tree focus.
Mounted inputs now focus synchronously; only opening an unmounted outline defers
focus, guarded by the original focused surface. The existing keyboard case now
also verifies slash opens a closed outline. All 13 final affected browser cases pass, including opening a closed outline. Final typecheck also passes.
