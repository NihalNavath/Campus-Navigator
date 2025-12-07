<script>
  import Map from "$lib/components/Map.svelte";

  let mapRef;
  let selectedBuilding = null;

  function handleSelectBuilding(e) {
    selectedBuilding = e.detail;
  }

  function handleClear() {
    selectedBuilding = null;
  }

  function handleGetDirections() {
    if (!selectedBuilding) return;
    mapRef.navigateTo(selectedBuilding.coordinates);
  }
</script>

<Map 
  bind:this={mapRef} 
  on:selectBuilding={handleSelectBuilding} 
/>

{#if selectedBuilding}
  <aside class="panel">
    <button class="close" on:click={() => (selectedBuilding = null)}>×</button>

    <h3>{selectedBuilding.name}</h3>

    <button class="go" on:click={handleGetDirections}>
      Get Directions
    </button>
  </aside>
{/if}

<style>
  .panel {
    position: absolute;
    right: 20px;
    top: 20px;
    background: white;
    padding: 20px;
    border-radius: 10px;
    z-index: 9999;
    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
  }
  .go {
    padding: 8px 12px;
    background: #007aff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 10px;
  }
  .close {
    background: none;
    border: none;
    font-size: 20px;
    float: right;
    cursor: pointer;
  }
</style>
