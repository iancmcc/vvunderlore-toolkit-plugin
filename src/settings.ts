import {
	PluginSettingTab,
	Setting,
	App,
	TFile,
	TFolder,
	AbstractInputSuggest,
	setIcon,
	Modal,
	MarkdownRenderer,
	Component,
	Notice,
	TextComponent,
	ToggleComponent,
	ButtonComponent,
	DropdownComponent,
	SearchComponent
} from 'obsidian';
import type VVunderloreToolkitPlugin from './main';
import { ConfirmFreshInstallModal } from './firstinstallconfirm';
import { showCustomInstallModal } from "./customInstallModal";



// Define your CustomPathEntry interface.
interface CustomPathEntry {
	vaultPath: string;
	manifestKey: string;
	doUpdate: boolean;
}

// FilePathSuggester for live search on vault files.
class FilePathSuggester extends AbstractInputSuggest<string> {
	private inputEl: HTMLInputElement;
	private paths: { path: string; isFolder: boolean }[] = [];
	private currentSuggestions: string[] = [];
	private renderedSuggestions: Map<HTMLElement, string> = new Map();

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;

		// Get folders and markdown files from the vault.
		const folders = Object.values(app.vault.getAllLoadedFiles())
			.filter((f): f is TFolder => f instanceof TFolder)
			.map(f => ({ path: f.path, isFolder: true }));
		const files = app.vault.getMarkdownFiles()
			.map(f => ({ path: f.path, isFolder: false }));
		this.paths = [...folders, ...files];

		this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				setTimeout(() => {
					const container = (this as any).containerEl as HTMLElement;
					if (!container) return;
					const selectedEl = container.querySelector('.suggestion-item.is-selected') as HTMLElement;
					if (selectedEl) {
						const selectedPath = this.renderedSuggestions.get(selectedEl);
						if (selectedPath) {
							this.selectSuggestion(selectedPath);
						}
					}
				}, 0);
			}
		});
	}

	getSuggestions(inputStr: string): string[] {
		const query = inputStr.toLowerCase();
		this.currentSuggestions = this.paths
			.filter(({ path }) => path.toLowerCase().includes(query))
			.map(p => p.path);
		return this.currentSuggestions;
	}

	renderSuggestion(path: string, el: HTMLElement): void {
		const isFolder = this.paths.find(p => p.path === path)?.isFolder;
		el.addClass("mod-complex");
		const iconEl = el.createDiv({ cls: 'suggestion-icon' });
		setIcon(iconEl, isFolder ? 'folder' : 'document');

		const name = path.split('/').pop()!;
		const displayName = isFolder ? name : name.replace(/\.md$/, '');
		el.createDiv({ text: displayName, cls: 'suggestion-title' });
		const parentPath = path.split('/').slice(0, -1).join('/');
		el.createDiv({ text: parentPath, cls: 'search-suggest-info-text' });
		el.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			this.selectSuggestion(path);
		});
		this.renderedSuggestions.set(el, path);
	}

	selectSuggestion(path: string): void {
		this.inputEl.value = path;
		this.inputEl.dispatchEvent(new Event("input"));
		this.close();
	}
}

// Modal for displaying the changelog.
class MarkdownPreviewModal extends Modal {
	constructor(app: App, private content: string) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.addEventListener('click', (e) => e.stopPropagation());
		this.contentEl.empty();
		this.contentEl.createEl('h2', { text: 'Toolkit Changelog' });
		const md = this.contentEl.createDiv();
		const dummyComponent = new class extends Component {}();
		MarkdownRenderer.renderMarkdown(this.content, md, '/', dummyComponent);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

// The full settings tab.
export class ToolkitSettingsTab extends PluginSettingTab {
	plugin: VVunderloreToolkitPlugin;

	constructor(app: App, plugin: VVunderloreToolkitPlugin) {
		super(app, plugin);
		this.plugin = plugin;  
	}   
	private renderHeader(root: HTMLElement): void {
		const header = root.createDiv();
		header.style.display = 'flex';
		header.style.justifyContent = 'space-between';
		header.style.alignItems = 'center';
		header.style.borderBottom = '1px solid var(--divider-color)';
		header.style.marginBottom = '2em';
		header.style.paddingBottom = '0.5em';
	  
		header.createEl('h3', { text: 'VVunderlore Toolkit Settings' });
	  
		const headerBtns = header.createDiv();
		headerBtns.style.display = 'flex';
		headerBtns.style.gap = '0.5em';
	  
		const docsBtn = headerBtns.createEl('button', { text: 'Docs' });
		docsBtn.onclick = () => window.open('http://vvunderlore.com', '_blank');
	  
		const githubBtn = headerBtns.createEl('button', { text: 'GitHub' });
		githubBtn.onclick = () =>
		  window.open('https://github.com/slamwise0001/VVunderlore-Toolkit-Full', '_blank');
	  
		const kofiBtn = headerBtns.createEl('button', {
		  text: '☕ Ko-fi',
		  cls: 'mod-cta',
		});
		kofiBtn.style.backgroundColor = '#ff5900';
		kofiBtn.style.color = 'white';
		kofiBtn.onclick = () => window.open('https://ko-fi.com/vvunderlore', '_blank');
	  }
	  
	  private renderFirstRunCard(root: HTMLElement) {
		// 1) Outer wrapper
		const card = root.createEl('div', { cls: 'vvunderlore-first-run' });
		// Make the card a flex‐column and center everything:
		Object.assign(card.style, {
		  display: 'flex',
		  flexDirection: 'column',
		  alignItems: 'center',
		  textAlign: 'center',
		  /* 
			Push the card a bit down from the top of the settings pane.
			You can adjust "2em" to move it higher or lower.
		  */
		  marginTop: '2em',
		  /* Optional: add some padding so it doesn't hug the edges */
		  padding: '1em',
		  border: '2px solid var(--divider-color)',
		  borderRadius: '18px',        /* (optional) round the corners slightly */
		  backgroundColor: 'var(--background-primary)', /* (optional) white/gray background */
		});
	  
		// 2) Header
		const title = card.createEl('h2', {
		  text: '🏰 Welcome to VVunderlore',
		  cls: 'vv-card-title',
		});
		// Give the title a little bottom margin
		title.style.marginBottom = '0.5em';
	  
		// 3) Instructional copy
		const desc = card.createEl('p', {
		  text:
			'Get started by installing the default toolkit—\nor choose individual pieces to suit your vault.',
		  cls: 'vv-card-desc',
		});
		// Slight bottom margin so it doesn't butt right up against the buttons
		desc.style.marginBottom = '1.25em';
	  
		// 4) Button row → YOU MUST declare btnRow here!
		const btnRow = card.createEl('div', { cls: 'vv-button-row' });
		// Make the two buttons sit side by side with a gap
		Object.assign(btnRow.style, {
		  display: 'flex',
		  gap: '0.75em',       // space between Install and Custom
		  justifyContent: 'center',
		});
		// And add a bit of bottom margin so the “skip” link isn’t too close
		btnRow.style.marginBottom = '1.5em';
	  
		const installBtn = btnRow.createEl('button', {
		  text: 'Install Toolkit',
		  cls: 'mod-cta',
		});
		installBtn.onClickEvent(async () => {
			// Open the confirm‐dialog instead of calling installFullToolkit() immediately
			new ConfirmFreshInstallModal(this.app, this.plugin).open();
		});
	  
		// “Custom Install” button (if/when you wire it up)
		const customBtn = btnRow.createEl('button', {
		  text: 'Custom Install',
		  cls: 'mod-cta',
		});
		// Make the custom button a ghost style so it contrasts with the primary CTA:
		Object.assign(customBtn.style, {
			background: 'none',
			border: '1px solid var(--interactive-accent)',
			color: 'var(--text-normal)',
		  });
		  
		  // Only one onClickEvent, calling your modal:
		  customBtn.onClickEvent(() => {
			showCustomInstallModal(this.app, this.plugin);
		  });
	  
		// 5) “Skip” link
		const skipPara = card.createEl('p', { cls: 'vv-skip-link' });
		// Center it and give it a tiny top margin
		Object.assign(skipPara.style, {
		  textAlign: 'center',
		  marginTop: '0.25em',
		});
		skipPara
		.createEl('a', {
		  text: 'Already have the Toolkit? Show me the settings →',
		})
		.onClickEvent(async () => {
		  // 1) Create the hidden marker file so "first‐run" never shows again:
		  const markerPath = '.vvunderlore_installed';
		  try {
			// Only write it if it does not exist yet
			if (!(await this.app.vault.adapter.exists(markerPath))) {
			  await this.app.vault.create(markerPath, '');
			}
		  } catch (e) {
			console.error('❌ Failed to create marker file:', e);
		  }
	  
		  // 2) Flip needsInstall to false (so the first‐run card is gone)
		  this.plugin.settings.needsInstall = false;
		  await this.plugin.saveSettings();
	  
		  // 3) Re‐render the normal settings UI
		  this.display();
		});
	  }
	  
	  
	private versionValueEl: HTMLElement | null = null;
	private forceWarningEl: HTMLElement | null = null;

	display(): void {
		console.log("🔧 display() called, needsInstall =", this.plugin.settings.needsInstall);
		const { containerEl } = this;
		const savedScrollTop = containerEl.scrollTop;
		containerEl.empty();
	
		this.renderHeader(containerEl); // 👈 Always render header first
	
		if (this.plugin.settings.needsInstall) {
			console.log("🧪 Showing first-run card");
			this.renderFirstRunCard(containerEl);
			containerEl.scrollTop = savedScrollTop;
			return;
		}
	;(async () => {	
		
		/** ─── VERSION SECTION ─── */
		const versionRow = containerEl.createDiv();
		versionRow.style.marginBottom = '1em';
		versionRow.style.display = 'flex';
		versionRow.style.justifyContent = 'space-between';
		versionRow.style.alignItems = 'flex-start';
		versionRow.style.gap = '2em';
		versionRow.style.flexWrap = 'wrap';
		versionRow.style.borderBottom = '1px solid var(--divider-color)';

		const versionInfo = versionRow.createDiv();
		versionInfo.style.display = 'flex';
		versionInfo.style.flexDirection = 'column';
		versionInfo.style.gap = '0.25em';

		let installed = 'Not installed';
		try {
			const verContent = await this.app.vault.adapter.read('.version.json');
			const json = JSON.parse(verContent);
			installed = json.version ?? 'Not installed';
		} catch (err) {
			console.warn('Could not read .version.json from vault:', err);
		}
		const latest = this.plugin.settings.latestToolkitVersion ?? 'Could not fetch';
		const isMatch = installed === latest;

		const vaultRow = versionInfo.createDiv();
		vaultRow.appendText('Vault Toolkit Version: ');
		
		this.versionValueEl = vaultRow.createSpan();  // 🔥 save ref
		this.versionValueEl.textContent = installed;
		this.versionValueEl.style.fontWeight = 'bold';
		this.versionValueEl.style.color = isMatch ? 'var(--text-success)' : 'var(--text-error)';
		
		const latestRow = versionInfo.createEl('div', { text: 'Latest Official Version: ' });
		latestRow.createSpan({
			text: latest,
			attr: { style: 'font-weight: bold; color: var(--text-success);' }
		});

		const versionControls = versionRow.createDiv();
		versionControls.style.display = 'flex';
		versionControls.style.flexDirection = 'column';
		versionControls.style.alignItems = 'flex-end';
		versionControls.style.gap = '0.5em';

		const buttonRow = versionControls.createDiv();
		buttonRow.style.display = 'flex';
		buttonRow.style.gap = '0.5em';

		const checkBtn = buttonRow.createEl('button', {
			text: installed !== latest ? 'Preview Update' : 'Check for Updates',
			cls: 'mod-cta'
		});
		checkBtn.addEventListener('click', async () => {
			if (installed !== latest) {
				this.plugin.previewUpdatesModal();
			} else {
				await this.plugin.checkForUpdates();
			}
		});
		const changelogBtn = buttonRow.createEl('button', { text: '📖 View Changelog' });
		changelogBtn.addEventListener('click', () => {
			new MarkdownPreviewModal(this.app, this.plugin.changelog).open();
		});
		if (this.plugin.settings.lastChecked) {
			const lastChecked = versionControls.createDiv();
			lastChecked.style.fontSize = '11px';
			lastChecked.style.color = 'var(--text-muted)';
			lastChecked.textContent = `Last checked: ${new Date(this.plugin.settings.lastChecked).toLocaleString()}`;
		}

		

		/** ─── FIX YOUR VAULT SECTION ─── */
		const fixSectionWrapper = containerEl.createDiv({ cls: 'vk-section' });

		// Header row
		const fixHeader = fixSectionWrapper.createDiv({ cls: 'vk-section-header' });

		Object.assign(fixHeader.style, {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'stretch',
			padding: '0.5em 0',
			borderBottom: '1px solid var(--divider-color)',
		});

		// Title + description inline
		const fixTitleBlock = fixHeader.createDiv({
			attr: { style: 'display: flex; flex-direction: column;' }
		});

		fixTitleBlock.createEl('h5', { text: 'Fix Your Vault' });
		fixTitleBlock.createEl('div', {
			text: 'If files are broken, missing, or misaligned, you can force an update to detect and reset those issues. You can also undo if needed.',
			cls: 'setting-item-description',
			attr: { style: 'margin-top: 0.25em;' },
		});

		// Button + warning row
		const fixButtonRow = fixSectionWrapper.createDiv();
		fixButtonRow.style.display = 'flex';
		fixButtonRow.style.justifyContent = 'space-between';
		fixButtonRow.style.alignItems = 'center';
		fixButtonRow.style.marginTop = '0.5em';

		const warningContainer = fixButtonRow.createDiv(); 
		this.forceWarningEl = warningContainer;

		// Left side: version warning (if mismatch)
		let installedVersionStr = '';
		try {
			const versionFile = await this.plugin.app.vault.adapter.read('.version.json');
			const parsed = JSON.parse(versionFile);
			installedVersionStr = (parsed.version ?? '').trim();
		} catch {
			installedVersionStr = '';
		}

		const latestVersionStr = (this.plugin.settings.latestToolkitVersion ?? '').trim();

		console.log("🧪 Comparing versions:", installedVersionStr, latestVersionStr);

		if (installedVersionStr && latestVersionStr && installedVersionStr !== latestVersionStr) {
			const warn = warningContainer.createEl('div', {
				text: `⚠️ New version available (${installedVersionStr} → ${latestVersionStr}) — use regular update instead`,
			});
			warn.style.fontSize = '0.85em';
			warn.style.color = 'var(--text-muted)';
			warn.style.fontStyle = 'italic';
			warn.setAttr(
				'title',
				'Force updating while a new version is available may skip important changes.'
			);
		}




		// ➡️ Right side: action buttons
		const buttonGroup = fixButtonRow.createDiv();
		buttonGroup.style.display = 'flex';
		buttonGroup.style.gap = '0.5em';

		buttonGroup.createEl('button', {
			text: 'Force Update Vault',
			cls: 'mod-cta'
		}).onclick = async () => {
			await this.plugin.forceUpdatePreviewAndConfirm();
		};

		buttonGroup.createEl('button', {
			text: 'Undo Update'
		}).onclick = async () => {
			await this.plugin.undoForceUpdate();
		};

		// Timestamp
		const fixTimestampRow = fixSectionWrapper.createDiv();
		Object.assign(fixTimestampRow.style, {
			textAlign: 'right',
			fontSize: '11px',
			color: 'var(--text-muted)',
			marginTop: '0.25em'
		});
		fixTimestampRow.textContent = `Last forced: ${
			this.plugin.settings.lastForceUpdate
				? new Date(this.plugin.settings.lastForceUpdate).toLocaleString()
				: 'Not forced yet'
		}`;


		// ───── HIGHLIGHT SECTION ───────────────────────────────────────────────────
		const highlightDetails = containerEl.createEl('details', { cls: 'vk-section' });

		// 1) Build the <summary> for highlight, matching backup style:
		const highlightSummary = highlightDetails.createEl('summary', { cls: 'vk-section-header' });
		Object.assign(highlightSummary.style, {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'stretch',
		padding: '0.5em 0',
		borderBottom: '1px solid var(--divider-color)',
		cursor: 'pointer',
		});

		// 1a) Create the title + icon row (flex row justify space-between):
		const highlightTitleRow = highlightSummary.createDiv({
		attr: {
			style: `
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			`,
		},
		});

		// 1b) Left side: title + description
		const hlTitleBlock = highlightTitleRow.createDiv({
		attr: { style: 'display: flex; flex-direction: column;' }
		});
		hlTitleBlock.createEl('h5', { text: 'VVunderlore File Highlighting' });
		hlTitleBlock.createEl('div', {
		text: 'Toggle on/off the highlighting of Toolkit-specific files. Also make the highlights cool colors.',
		cls: 'setting-item-description',
		attr: { style: 'margin-top: 0.25em;' },
		});

		// 1c) Right side: collapsing arrow/icon
		const hlToggleIcon = highlightTitleRow.createEl('span', { text: 'VV', cls: 'vk-toggle-icon' });
		Object.assign(hlToggleIcon.style, {
		fontWeight: 'bold',
		display: 'inline-block',
		transition: 'transform 0.2s ease',
		transformOrigin: '50% 50%',
		userSelect: 'none',
		transform: highlightDetails.open ? 'rotate(0deg)' : 'rotate(180deg)',
		});

		// 1d) Make the icon rotate when the <details> opens/closes:
		highlightDetails.ontoggle = () => {
		hlToggleIcon.style.transform = highlightDetails.open ? 'rotate(0deg)' : 'rotate(180deg)';
		};

		// 2) Create the body container (indented, same as backup)
		const highlightBody = highlightDetails.createDiv({ cls: 'vk-section-body' });
		highlightBody.style.paddingLeft = '1em';

		// 3) “Enable Highlight” toggle as a Setting inside highlightBody:
		new Setting(highlightBody)
		.setName('Enable File/Folder Highlighting')
		.setDesc('Any file/folder installed by VVunderlore will have this background.')
		.addToggle(toggle => {
			toggle
			.setValue(this.plugin.settings.highlightEnabled)
			.onChange(async (enabled) => {
				this.plugin.settings.highlightEnabled = enabled;
				await this.plugin.saveSettings();

				if (enabled) {
				this.plugin.enableHighlight();
				} else {
				this.plugin.disableHighlight();
				}

				// Re‐render the color pickers whenever the toggle changes:
				renderHighlightColorPickers();
			});
		});

		// 4) Wrapper for Light/Dark color pickers:
		const colorPickerWrapper = highlightBody.createDiv();

		// 5) A function to render or clear the two ColorPicker settings:
		const renderHighlightColorPickers = () => {
		colorPickerWrapper.empty();

		if (!this.plugin.settings.highlightEnabled) {
			return; // do not show pickers if highlighting is disabled
		}

		// 5a) Light mode color picker
		new Setting(colorPickerWrapper)
			.setName('Light Mode Highlight Color')
			.setDesc('Choose the background color for files/folders in Light mode.')
			.addColorPicker(picker => {
			picker
				.setValue(this.plugin.settings.highlightColorLight)
				.onChange(async (newColor) => {
				this.plugin.settings.highlightColorLight = newColor;
				await this.plugin.saveSettings();

				// Re‐inject CSS so the new color takes effect immediately:
				this.plugin.disableHighlight();
				this.plugin.enableHighlight();
				});
			});

		// 5b) Dark mode color picker
		new Setting(colorPickerWrapper)
			.setName('Dark Mode Highlight Color')
			.setDesc('Choose the background color for files/folders in Dark mode.')
			.addColorPicker(picker => {
			picker
				.setValue(this.plugin.settings.highlightColorDark)
				.onChange(async (newColor) => {
				this.plugin.settings.highlightColorDark = newColor;
				await this.plugin.saveSettings();

				// Re‐inject CSS so the new color takes effect immediately:
				this.plugin.disableHighlight();
				this.plugin.enableHighlight();
				});
			});
		};

		// 6) Call once on initial render so that if highlightEnabled === true, the pickers show up.
		renderHighlightColorPickers();

		// ─── BACKUP SECTION ────────────────────────────────────
		const backupDetails = containerEl.createEl('details', { cls: 'vk-section' });

		// Summary block: stacked column layout
		const backupSummary = backupDetails.createEl('summary', { cls: 'vk-section-header' });

		Object.assign(backupSummary.style, {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'stretch',
		padding: '0.5em 0',
		borderBottom: '1px solid var(--divider-color)',
		cursor: 'pointer',
		});

		// Create title + icon row
		const backupTitleRow = backupSummary.createDiv({
		attr: {
			style: `
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			`,
		},
		});

		// Left: header block (title + description together) 
		const titleBlock = backupTitleRow.createDiv({
		attr: { style: 'display: flex; flex-direction: column;' }
		});

		titleBlock.createEl('h5', { text: 'Vault Backups' });

		titleBlock.createEl('div', {
		text: 'The Toolkit will back up your vault automatically before updates. You can also back up manually anytime.',
		cls: 'setting-item-description',
		attr: { style: 'margin-top: 0.25em;' },
		});

		// Right: collapse icon
		const backupVvIcon = backupTitleRow.createEl('span', { text: 'VV', cls: 'vk-toggle-icon' });

		Object.assign(backupVvIcon.style, {
		fontWeight: 'bold',
		display: 'inline-block',
		transition: 'transform 0.2s ease',
		transformOrigin: '50% 50%',
		userSelect: 'none',
		transform: backupDetails.open ? 'rotate(0deg)' : 'rotate(180deg)',
		});

		// Collapse rotation behavior
		backupDetails.ontoggle = () => {
		backupVvIcon.style.transform = backupDetails.open ? 'rotate(0deg)' : 'rotate(180deg)';
		};

		// 2) Body
		const backupBody = backupDetails.createDiv({ cls: 'vk-section-body' });
		backupBody.style.paddingLeft = '1em';

		new Setting(backupBody)
		.setName('Auto-Backup Before Update')
		.setDesc('Create a full .zip of the vault before applying version updates. Force updates will only back up the files that will be modified or removed.')
		.addToggle(t =>
			t
			.setValue(this.plugin.settings.autoBackupBeforeUpdate)
			.onChange(async v => {
				this.plugin.settings.autoBackupBeforeUpdate = v;
				await this.plugin.saveSettings();
			})
		);

		new Setting(backupBody)
		.setName('Manual Backup')
		.setDesc('Immediately create a zip backup of your vault')
		.addButton(b =>
			b
			.setButtonText('Backup Vault Now')
			.setCta()
			.onClick(async () => {
				const path = await this.plugin.backupManager.backupVaultToZip('manual');
				new Notice(`Backup created: ${path}`);
			})
		);

		backupBody.createEl('div', {
			attr: {
			  style: 'border-top: 1px solid var(--divider-color); margin-top: 1.5em;'
			}
		  });

		// ──────────────── CUSTOM UPDATES SECTION ────────────────
		const customizationDetails = containerEl.createEl('details', { cls: 'vk-section' });

		const customizationSummary = customizationDetails.createEl('summary', { cls: 'vk-section-header' });

		Object.assign(customizationSummary.style, {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		padding: '0.5em 0',
		cursor: 'pointer',
		});

		// Title row with h5 + description (left) and VV icon (right)
		const titleRow = customizationSummary.createDiv({
		attr: {
			style: `
			display: flex;
			width: 100%;
			justify-content: space-between;
			align-items: flex-end;
			`,
		},
		});

		// Left block: h5 + description
		const customizationTitleBlock = titleRow.createDiv({
		attr: { style: 'display: flex; flex-direction: column;' }
		});

		const h5 = customizationTitleBlock.createEl('h5');
		h5.appendText('Custom Updates – ');

		const redSpan = h5.createSpan({ text: 'Advanced Users Only' });
		redSpan.style.color = 'var(--text-error)'; // or '#e03131' for a bolder red


		customizationTitleBlock.createEl('div', {
		text: 'Use these controls to skip updates on certain files or remap relocated Toolkit files so they can update.',
		cls: 'setting-item-description',
		attr: { style: 'margin-top: 0.25em;' },
		});

		// Right: VV icon aligned to bottom
		const customVvIcon = titleRow.createEl('span', { text: 'VV', cls: 'vk-toggle-icon' });

		Object.assign(customVvIcon.style, {
		fontWeight: 'bold',
		transition: 'transform 0.2s ease',
		transformOrigin: '50% 50%',
		userSelect: 'none',
		transform: customizationDetails.open ? 'rotate(0deg)' : 'rotate(180deg)',
		});

		customizationDetails.ontoggle = () => {
		customVvIcon.style.transform = customizationDetails.open ? 'rotate(0deg)' : 'rotate(180deg)';
		};

		const customizationBodyWrapper = customizationDetails.createDiv({
			attr: { style: 'padding-left: 1em; padding-right: 1em;' }
		  });
		  const customizationBody = customizationBodyWrapper.createDiv({ cls: 'vk-section-body' });



		// ─── SKIP-LIST PANEL ──────────────────────────────────────────────

		const skipSection = customizationBody.createDiv();

		// 1. Create setting block (matches Obsidian native UI layout)
		const settingItem = skipSection.createDiv({ cls: 'setting-item' });

		// 2. Left column: title + description
		const info = settingItem.createDiv({ cls: 'setting-item-info' });
		info.createDiv({ text: 'Skip Toolkit Items', cls: 'setting-item-name' });
		info.createDiv({
		text: 'Files listed here will be ignored during toolkit updates.',
		cls: 'setting-item-description',
		});

		// 3. Right column: dropdown + button
		const control = settingItem.createDiv({ cls: 'setting-item-control' });

		const dropdown = new DropdownComponent(control);
		dropdown.selectEl.style.minWidth = '220px';
		dropdown.addOption('', 'Select an item…');
		this.plugin.manifestCache.files
		.filter(f => !f.optional)
		.forEach(f => dropdown.addOption(f.path, f.displayName ?? f.path.split('/').pop()!));
		this.plugin.manifestCache.folders
		.filter(f => !f.optional)
		.forEach(f => dropdown.addOption(f.path, (f.displayName ?? f.path.split('/').pop()!) + '/ (folder)'));

		new ButtonComponent(control)
		.setButtonText('Add')
		.setCta()
		.onClick(async () => {
			const key = dropdown.getValue();
			if (!key) return new Notice('Pick something to skip.');
			if (!this.plugin.settings.customPaths.some(c => c.manifestKey === key)) {
			this.plugin.settings.customPaths.push({ vaultPath: key, manifestKey: key, doUpdate: false });
			await this.plugin.saveSettings();
			renderSkipTable();
			}
		});

		// 4. Table wrapper for skipped items
		const skipTableWrapper = skipSection.createDiv({ cls: 'vk-table-wrapper', attr: { style: 'margin-top:0.75em' } });

		const renderSkipTable = () => {
		skipTableWrapper.empty();

		const items = this.plugin.settings.customPaths.filter(c => !c.doUpdate);

		if (items.length === 0) {
			// No table if nothing to show — just an empty state message
			const emptyMsg = skipTableWrapper.createEl('div', { text: 'No items skipped.' });
			emptyMsg.style.textAlign = 'center';
			emptyMsg.style.opacity = '0.6';
			emptyMsg.style.padding = '0.5em';
			return;
		}

		// Render table only if items exist
		const table = skipTableWrapper.createEl('table', { cls: 'setting-table' });

		const header = table.createTHead().insertRow();
		header.insertCell().textContent = 'Skipped Files/Folders';

		const body = table.createTBody();

		items.forEach((entry) => {
			const row = body.insertRow();
			const contentCell = row.insertCell();
			contentCell.colSpan = 1;
			contentCell.style.display = 'flex';
			contentCell.style.justifyContent = 'space-between';
			contentCell.style.alignItems = 'center';
			contentCell.style.gap = '1em';

			contentCell.createSpan({ text: entry.manifestKey });

			const removeLink = contentCell.createEl('a', { text: 'Remove entry', href: '#' });
			removeLink.style.fontSize = '0.8em';
			removeLink.style.color = 'var(--text-faint)';
			removeLink.style.textDecoration = 'underline';
			removeLink.onclick = async (e) => {
			e.preventDefault();
			this.plugin.settings.customPaths.remove(entry);
			await this.plugin.saveSettings();
			renderSkipTable();
			};
		});
		};

		renderSkipTable();

		// ──────────────── Spacer & Divider Before Remap Panel ────────────────
		customizationBody.createEl('div', {
			attr: { style: 'height: 1em; border-top: 1px solid var(--divider-color); margin: 1em 0;' }
		});

		// ──────────────── REMAP PANEL ────────────────
		const remapSection = customizationBody.createDiv();


		// Setting-style wrapper
		const remapSetting = remapSection.createDiv({ cls: 'setting-item' });

		// Left: header + description (unchanged style)
		const remapInfo = remapSetting.createDiv({ cls: 'setting-item-info' });
		remapInfo.createDiv({ text: 'Remap File Paths', cls: 'setting-item-name' });
		remapInfo.createDiv({
			text: 'Remap toolkit files vault paths if you chose to move anything. Moving files without remapping will result in duplicate and/or out-of-date files after update.',
			cls: 'setting-item-description'
		});

		// New full-width block below for controls
		const remapControlBlock = remapSection.createDiv({ cls: 'vk-inline-add-controls' });
		remapControlBlock.style.flexWrap = 'wrap';
		remapControlBlock.style.marginTop = '0.5em';

		let remapDrop: DropdownComponent;
		let remapInput: HTMLInputElement;

		remapDrop = new DropdownComponent(remapControlBlock);
		remapDrop.selectEl.style.minWidth = '220px';
		remapDrop.addOption('', 'Select an item…');
		this.plugin.manifestCache.files.forEach(f =>
			remapDrop.addOption(f.path, f.displayName ?? f.path.split('/').pop()!)
		);
		this.plugin.manifestCache.folders.forEach(f =>
			remapDrop.addOption(f.path, (f.displayName ?? f.path.split('/').pop()!) + '/ (folder)')
		);

		const searchWrapper = remapControlBlock.createDiv();
		const searchComponent = new SearchComponent(searchWrapper);
		searchComponent.setPlaceholder('Search vault path…');
		new FilePathSuggester(this.app, searchComponent.inputEl);
		remapInput = searchComponent.inputEl;

		new ButtonComponent(remapControlBlock)
			.setButtonText('Add Remap')
			.setCta()
			.onClick(async () => {
				const key = remapDrop.getValue();
				const vp = remapInput.value.trim();
				if (!key || !vp) return new Notice('Select an item and enter a vault path.');
				if (!this.app.vault.getAbstractFileByPath(vp)) return new Notice('Vault path not found.');
				this.plugin.settings.customPaths = this.plugin.settings.customPaths.filter(c => c.manifestKey !== key);
				this.plugin.settings.customPaths.push({ manifestKey: key, vaultPath: vp, doUpdate: true });
				await this.plugin.saveSettings();
				remapInput.value = '';
				remapDrop.setValue('');
				renderRemapPanel();
			});


		// 4. Table wrapper
		const remapTableWrapper = remapSection.createDiv({ cls: 'vk-table-wrapper', attr: { style: 'margin-top: 0.75em' } });

		const renderRemapPanel = () => {
		remapTableWrapper.empty();

		const toRemap = this.plugin.settings.customPaths.filter(c => c.doUpdate);

		if (toRemap.length === 0) {
			const emptyMsg = remapTableWrapper.createEl('div', { text: 'No custom paths defined.' });
			emptyMsg.style.textAlign = 'center';
			emptyMsg.style.opacity = '0.6';
			emptyMsg.style.padding = '0.5em';
			return;
		}

		const table = remapTableWrapper.createEl('table', { cls: 'setting-table' });
		const head = table.createTHead().insertRow();
		['Toolit Item', 'New Vault Path', ''].forEach(txt => head.insertCell().textContent = txt);

		const body = table.createTBody();
		toRemap.forEach(entry => {
			const row = body.insertRow();

			// Manifest Key
			row.insertCell().textContent = entry.manifestKey;

			// Vault Path
			row.insertCell().textContent = entry.vaultPath;

			// Remove link
			const removeCell = row.insertCell();
			const removeLink = removeCell.createEl('a', { text: 'Remove entry', href: '#' });
			removeLink.style.fontSize = '0.8em';
			removeLink.style.color = 'var(--text-faint)';
			removeLink.style.textDecoration = 'underline';
			removeLink.onclick = async (e) => {
			e.preventDefault();
			this.plugin.settings.customPaths.remove(entry);
			await this.plugin.saveSettings();
			renderRemapPanel();
			};
		});
		};

		renderRemapPanel();

		// Add divider inside the body, at the top
		customizationBody.createEl('div', {
			attr: {
			style: 'border-top: 1px solid var(--divider-color); margin: 0.5em 0;'
			}
		});


		// ─── INITIAL DRAW ───────────────────────────────────────────────────────
		renderSkipTable();
		renderRemapPanel();





		/** ─── FOOTER SECTION ─── */
		const footer = containerEl.createDiv({ cls: 'setting-item' });
		Object.assign(footer.style, {
		fontSize: '0.85em',
		color: 'var(--text-muted)',
		marginTop: '2em',
		borderTop: 'none' // 👈 explicitly remove any top border
		});
		footer.createEl('span', {
			text: `VVunderlore Toolkit Plugin v${this.plugin.manifest.version} • `
		});
		footer.createEl('a', {
			text: 'View on GitHub',
			href: 'https://github.com/slamwise0001/vvunderlore-toolkit-plugin',
			attr: { target: '_blank' }
		});

		containerEl.scrollTop = savedScrollTop;
	})();
	}

	async updateVersionDisplay(): Promise<void> {
		if (!this.versionValueEl || !this.forceWarningEl) return;
	  
		// read .version.json
		let installed = '';
		try {
		  const ver = await this.plugin.app.vault.adapter.read('.version.json');
		  installed = JSON.parse(ver).version ?? '';
		} catch {}
		const latest = (this.plugin.settings.latestToolkitVersion ?? '').trim();
		const isMatch = installed === latest;
	  
		// update just the version span
		this.versionValueEl.textContent = installed || 'Not installed';
		this.versionValueEl.style.color = isMatch
		  ? 'var(--text-success)'
		  : 'var(--text-error)';
	  
		// clear and re-render just the warning container
		this.forceWarningEl.empty();
		if (installed && latest && installed !== latest) {
		  const warn = this.forceWarningEl.createDiv({
			text: `⚠️ New version available (${installed} → ${latest}) — use regular update instead`,
		  });
		  warn.style.cssText = `
			font-size: 0.85em;
			color: var(--text-muted);
			font-style: italic;
		  `;
		  warn.setAttr('title', 'Force updating while a new version is available may skip important changes.');
		}
	  }
	  
}  
