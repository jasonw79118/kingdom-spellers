import VoicePicker from "../components/VoicePicker";

export default function SettingsPage() {
  return <div className="ks-stack" style={{maxWidth:760,margin:"0 auto"}}>
    <h1 className="page-title">Settings</h1>
    <p className="ks-muted">Choose the reading voice for this device.</p>
    <VoicePicker />
    <section className="card ks-stack" aria-labelledby="effects-settings-title">
      <h2 id="effects-settings-title" style={{margin:0}}>Game sounds</h2>
      <p style={{margin:0}}>Open Sounds on or Sounds off in the header to change effects volume, mute effects, or preview a sound. Reading voice stays available when effects are muted.</p>
    </section>
  </div>;
}
