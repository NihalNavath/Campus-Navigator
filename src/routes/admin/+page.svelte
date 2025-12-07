<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let username = '';
	let password = '';
	let error = '';
	let loading = false;

	onMount(async () => {
		// Check if already logged in
		const res = await fetch('/api/auth/me');
		if (res.ok) {
			goto('/admin/dashboard');
		}
	});

	async function handleLogin(e) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username, password })
			});

			const data = await res.json();

			if (res.ok) {
				goto('/admin/dashboard');
			} else {
				error = data.error || 'Login failed';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
			console.error('Login error:', err);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Login - Christ Map Navigator</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="header">
			<h1>Admin Login</h1>
			<p>Christ University Map Navigator</p>
		</div>

		<form on:submit={handleLogin}>
			<div class="form-group">
				<label for="username">Username</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					placeholder="Enter username"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter password"
					required
					disabled={loading}
				/>
			</div>

			{#if error}
				<div class="error-message">
					⚠️ {error}
				</div>
			{/if}

			<button type="submit" class="login-btn" disabled={loading}>
				{loading ? 'Logging in...' : 'Login'}
			</button>
		</form>

		<div class="footer">
			<a href="/">← Back to Map</a>
		</div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 20px;
	}

	.login-card {
		background: white;
		border-radius: 16px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 420px;
		padding: 40px;
	}

	.header {
		text-align: center;
		margin-bottom: 32px;
	}

	.header h1 {
		font-size: 28px;
		font-weight: 700;
		color: #1a202c;
		margin: 0 0 8px 0;
	}

	.header p {
		font-size: 14px;
		color: #718096;
		margin: 0;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		font-size: 14px;
		font-weight: 600;
		color: #2d3748;
		margin-bottom: 8px;
	}

	.form-group input {
		width: 100%;
		padding: 12px 16px;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 15px;
		transition: all 0.2s;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.form-group input:disabled {
		background: #f7fafc;
		cursor: not-allowed;
	}

	.error-message {
		background: #fff5f5;
		color: #c53030;
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
		margin-bottom: 20px;
		border: 1px solid #feb2b2;
	}

	.login-btn {
		width: 100%;
		padding: 14px 24px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	}

	.login-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
	}

	.login-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.footer {
		text-align: center;
		margin-top: 24px;
		padding-top: 24px;
		border-top: 1px solid #e2e8f0;
	}

	.footer a {
		color: #667eea;
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		transition: color 0.2s;
	}

	.footer a:hover {
		color: #764ba2;
	}
</style>
