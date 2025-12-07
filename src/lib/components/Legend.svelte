<script>
  export let className = '';
</script>

<div class={"legend " + className}>
  <h3>Campus Legend</h3>
  <div><span style="background: blue"></span> Devdan Block</div>
  <div><span style="background: #00ff00"></span> Sports Areas</div>
  <div><span style="background: #ff9900"></span> Academic Blocks</div>
  <div><span style="background: #f1c40f"></span> Chapel</div>
  <div><span style="background: #6a040f"></span> Canteens</div>
  <div><span style="background: #9d0208"></span> Open Auditorium</div>
  <div><span style="background: #9bf6ff"></span> Ponds</div>
  <div><span style="background: #ff00ff"></span> PU College</div>
</div>

<style>
  .legend {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.65);
    color: white;
    padding: 12px 15px;
    border-radius: 8px;
    font-family: sans-serif;
    font-size: 14px;
    max-width: 220px;
    z-index: 9999;
  }
  .legend h3 { margin: 0 0 10px; font-size: 16px; }
  .legend div { margin-bottom: 6px; display:flex; align-items:center; }
  .legend span { width:16px; height:16px; margin-right:8px; border-radius:4px; display:inline-block; }
</style>
