import { FrappeProvider, useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import type { FrappeError as SDKError } from "frappe-react-sdk";

const PY = "warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard";

function errText(e: SDKError | null | undefined): string {
	if (!e) return "";
	const any = e as unknown as { message?: string };
	return any.message || String(e);
}

function PowDashboardInner() {
	const { currentUser, isLoading: authLoading, error: authError } = useFrappeAuth();
	const prof = useFrappeGetCall<unknown[]>(
		`${PY}.get_applicable_pow_profiles`,
		undefined,
		"pow-applicable-profiles",
	);
	const sess = useFrappeGetCall<Record<string, unknown> | null>(
		`${PY}.get_active_pow_session`,
		undefined,
		"pow-active-session",
	);

	if (authLoading) {
		return <p className="pow-muted">Checking session…</p>;
	}
	if (authError) {
		return <p className="pow-error">Auth: {errText(authError)}</p>;
	}

	return (
		<>
			<div className="pow-card">
				<h2 style={{ margin: "0 0 0.5rem" }}>POW Dashboard (React)</h2>
				<p className="pow-muted" style={{ margin: 0 }}>
					Slice 1 — same-origin <code>FrappeProvider</code>, profiles + active session via{" "}
					<code>useFrappeGetCall</code>. Follow Raven-style Vite app co-located with the Frappe app; ship
					feature parity in thin slices.
				</p>
			</div>
			<div className="pow-card">
				<strong>User</strong>
				<p style={{ margin: "0.35rem 0 0" }}>{currentUser ?? "—"}</p>
			</div>
			<div className="pow-card">
				<strong>Applicable POW profiles</strong>
				{prof.isLoading ? (
					<p className="pow-muted">Loading…</p>
				) : prof.error ? (
					<p className="pow-error">{errText(prof.error)}</p>
				) : (
					<pre style={{ margin: "0.5rem 0 0", fontSize: 12, overflow: "auto" }}>
						{JSON.stringify(prof.data, null, 2)}
					</pre>
				)}
			</div>
			<div className="pow-card">
				<strong>Active POW session</strong>
				{sess.isLoading ? (
					<p className="pow-muted">Loading…</p>
				) : sess.error ? (
					<p className="pow-error">{errText(sess.error)}</p>
				) : (
					<pre style={{ margin: "0.5rem 0 0", fontSize: 12, overflow: "auto" }}>
						{JSON.stringify(sess.data, null, 2)}
					</pre>
				)}
			</div>
		</>
	);
}

export function App() {
	return (
		<FrappeProvider swrConfig={{ revalidateOnFocus: false }} enableSocket={false}>
			<div className="pow-shell">
				<PowDashboardInner />
			</div>
		</FrappeProvider>
	);
}
