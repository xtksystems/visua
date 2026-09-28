/**
 * SAML parts of the organization's single sign-on settings: pasting a provider's metadata and
 * reading it back before saving, and a SAML connection's details: what to enter in the
 * provider, the certificates Visua trusts, and replacing the metadata (certificate rotation).
 */
import { useMutation } from "@tanstack/react-query";
import { Copy, Eye, RefreshCw } from "lucide-react";
import { useState } from "react";
import { copyText, StatusChip, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { shortDate } from "../lib/format.ts";

export interface SamlCertificate {
  fingerprint: string;
  notAfter: string;
  standing: "valid" | "expiring" | "expired";
}
/** What the server read from a provider's metadata. */
export interface SamlPreview {
  entityId: string;
  ssoUrl: string;
  certificates: SamlCertificate[];
}
/** Visua's side of a SAML connection. */
export interface SamlSide {
  entityId: string;
  acsUrl: string;
  metadataUrl: string;
}

export function CertificateChip({ c }: { c: SamlCertificate }) {
  if (c.standing === "expired") return <StatusChip status="at-risk" label={`Expired ${shortDate(c.notAfter)}`} />;
  if (c.standing === "expiring") return <StatusChip status="at-risk" label={`Expires ${shortDate(c.notAfter)}`} />;
  return <StatusChip status="verified" label={`Valid until ${shortDate(c.notAfter)}`} />;
}

function Certificates({ list }: { list: SamlCertificate[] }) {
  return (
    <ul className="stack" aria-label="Signing certificates" style={{ gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
      {list.map((c) => (
        <li key={c.fingerprint} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="mono" title={c.fingerprint} style={{ fontSize: 12, overflowWrap: "anywhere" }}>
            SHA-256 {c.fingerprint.slice(0, 23)}…
          </span>
          <CertificateChip c={c} />
        </li>
      ))}
    </ul>
  );
}

/** Paste a provider's metadata, then read it back before saving (the server stores nothing). */
export function SamlMetadataField(props: { tenantId: string; id: string; value: string; onChange: (value: string) => void; preview?: SamlPreview; onPreview: (preview: SamlPreview | undefined) => void }) {
  const { tenantId, id, value, onChange, preview, onPreview } = props;
  const read = useMutation({
    mutationFn: () => api.post<SamlPreview>(`/tenants/${tenantId}/sso/saml/preview`, { metadataXml: value }),
    onSuccess: (p) => onPreview(p),
    onError: (e: Error) => {
      onPreview(undefined);
      toast(e.message, "error");
    },
  });
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="field">
        <label htmlFor={id}>Identity provider metadata (XML)</label>
        <textarea
          id={id}
          className="textarea mono"
          rows={6}
          required
          spellCheck={false}
          value={value}
          placeholder={'<md:EntityDescriptor entityID="…">'}
          onChange={(e) => {
            onChange(e.target.value);
            onPreview(undefined);
          }}
        />
        <span className="field__hint">From your provider's application for Visua: Okta “Identity Provider metadata”, Entra ID “Federation Metadata XML”, AD FS FederationMetadata.xml.</span>
      </div>
      <div>
        <button type="button" className="btn" disabled={!value.trim() || read.isPending} onClick={() => read.mutate()}>
          <Eye size={15} aria-hidden /> Read metadata
        </button>
      </div>
      {preview && (
        <dl className="stack" role="group" aria-label="Read from the metadata" style={{ gap: 6, margin: 0 }}>
          <div>
            <dt className="muted">Entity ID</dt>
            <dd className="mono" style={{ margin: 0, overflowWrap: "anywhere" }}>
              {preview.entityId}
            </dd>
          </div>
          <div>
            <dt className="muted">Sign-in URL</dt>
            <dd className="mono" style={{ margin: 0, overflowWrap: "anywhere" }}>
              {preview.ssoUrl}
            </dd>
          </div>
          <div>
            <dt className="muted">Signing certificates</dt>
            <dd style={{ margin: 0 }}>
              <Certificates list={preview.certificates} />
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** A SAML connection: what to enter in the provider, the certificates Visua trusts, and rotation (owners). */
export function SamlDetails(props: { tenantId: string; connection: { id: string; name: string; saml: SamlPreview; sp: SamlSide }; owner: boolean; onChange: () => void }) {
  const { tenantId, connection, owner, onChange } = props;
  const [open, setOpen] = useState(false);
  const [xml, setXml] = useState("");
  const [preview, setPreview] = useState<SamlPreview>();
  const replace = useMutation({
    mutationFn: () => api.patch(`/tenants/${tenantId}/sso/${connection.id}`, { metadataXml: xml }),
    onSuccess: () => {
      toast("Metadata replaced: the domains and their proof are kept");
      setOpen(false);
      setXml("");
      setPreview(undefined);
      onChange();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const cancel = () => {
    setOpen(false);
    setXml("");
    setPreview(undefined);
  };
  const rows = [
    ["Entity ID (audience)", connection.sp.entityId],
    ["Assertion consumer service URL", connection.sp.acsUrl],
    ["Metadata URL", connection.sp.metadataUrl],
  ] as const;
  const heading = `saml-${connection.id}`;
  return (
    <section className="panel stack" style={{ gap: 10 }} aria-labelledby={heading}>
      <h2 className="section-title" id={heading} style={{ margin: 0 }}>
        SAML: “{connection.name}”
      </h2>
      <p className="muted" style={{ margin: 0 }}>
        Enter these in your identity provider's application for Visua (HTTP-POST binding, the email address as NameID). Sign-in always starts at Visua: a dashboard tile can
        link to the Visua sign-in page. Leave assertion encryption off and single logout unset: Visua does not support them yet, and signing out of Visua ends the Visua
        session only.
      </p>
      <dl className="stack" style={{ gap: 6, margin: 0 }}>
        {rows.map(([label, value]) => (
          <div key={label} className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <dt className="muted" style={{ flex: "0 0 200px" }}>
              {label}
            </dt>
            <dd style={{ margin: 0, minWidth: 0, flex: "0 1 auto" }}>
              <code className="secret" style={{ display: "block", overflowWrap: "anywhere" }}>
                {value}
              </code>
            </dd>
            <button className="btn btn--quiet btn--sm btn--icon" aria-label={`Copy the ${label.toLowerCase()} of ${connection.name}`} onClick={() => copyText(value, label)}>
              <Copy size={14} />
            </button>
          </div>
        ))}
      </dl>
      <div className="stack" style={{ gap: 4 }}>
        <strong style={{ fontSize: 13 }}>Signing certificates of {connection.saml.entityId}</strong>
        <Certificates list={connection.saml.certificates} />
      </div>
      {owner && !open && (
        <div>
          <button className="btn" onClick={() => setOpen(true)}>
            <RefreshCw size={15} aria-hidden /> Replace metadata
          </button>
        </div>
      )}
      {owner && open && (
        <form
          className="stack"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            replace.mutate();
          }}
        >
          <SamlMetadataField tenantId={tenantId} id={`saml-metadata-${connection.id}`} value={xml} onChange={setXml} preview={preview} onPreview={setPreview} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--primary" type="submit" disabled={!preview || replace.isPending}>
              Save new metadata
            </button>
            <button className="btn btn--quiet" type="button" onClick={cancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
