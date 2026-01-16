<script>
	import { fade } from 'svelte/transition';
	export let blockName = '';
	export let subVenues = [];
	export let visible = false;
	export let onClose = () => {};
</script>

{#if visible}
	<div class="popup-container" transition:fade={{ duration: 200 }}>
		<div class="popup-header">
			<h3>{blockName}</h3>
			<button class="close-btn" on:click={onClose}>×</button>
		</div>
		<div class="popup-content">
			<h4>Sub Venues</h4>
			{#if subVenues.length === 0}
				<p class="empty">No sub-venues listed.</p>
			{:else}
				<ul>
					{#each subVenues as venue}
						<li>{venue}</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<style>
	.popup-container {
		position: absolute;
		top: 20px;
		left: 20px;
		width: 250px;
		background-color: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.6);
		border-radius: 8px;
		padding: 15px;
		z-index: 2000;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		color: #333;
	}

	.popup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		padding-bottom: 5px;
	}

	h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #000;
	}

	h4 {
		margin: 0 0 8px 0;
		font-size: 0.9rem;
		color: #555;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		color: #666;
	}

	.close-btn:hover {
		color: #000;
	}

	ul {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}

	li {
		padding: 4px 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
		font-size: 0.95rem;
	}

	li:last-child {
		border-bottom: none;
	}

	.empty {
		font-size: 0.9rem;
		color: #777;
		font-style: italic;
	}
</style>
