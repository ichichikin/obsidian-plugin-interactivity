import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, normalizePath, Platform, FileSystemAdapter } from 'obsidian';

interface InteractivityPluginSettings {
	shellExec: string;
	shellParams: string;
	executeOnLoad: string;
	notice: boolean;
	decorateMultiline: boolean;
	linesToSuppress: number;
	separatedShells: boolean;
	prependOutput: string;
	enviromentVariables: string;
	executeOnUnload: string;
	regexpCleaner: string;
	shortcuts: string;
	advanced: boolean;
}

const DEFAULT_SETTINGS: InteractivityPluginSettings = {
	shellExec: 'python',
	shellParams: '-iq\n##plugin##py_manager.py\n',
	executeOnLoad: 'openai.api_key = "sk-"\n',
	notice: false,
	decorateMultiline: true,
	linesToSuppress: 1,
	separatedShells: false,
	prependOutput: '>>> ',
	enviromentVariables: "PYTHONIOENCODING=utf8\n",
	executeOnUnload: "exit()\n",
	regexpCleaner: '^((>>> )|(\.\.\. ))+',
	shortcuts: '@ -> ##param##\n',
	advanced: false
}

const __EVAL = (s: string) => (0, eval)(`void (__EVAL = ${__EVAL.toString()}); ${s}`);

export default class InteractivityPlugin extends Plugin {
	settings: InteractivityPluginSettings;
	allSubprocesses: { [key: string]: any } = {};
	warmupOnly: boolean = false;
	modal: boolean = false;
	advanced: boolean = false;
	byEnter: boolean = false;
	processingNote: string = '';
	statusBarItemEl: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.advanced = Platform.isMobile ? false : this.settings.advanced;

		this.addSettingTab(new InteractivitySettingTab(this.app, this));

		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			// To be sure that subprocess is ready before user runs any command
			if (!this.modal) {
				this.warmupOnly = true;
				(this.app as any).commands.executeCommandById('interactivity:restart');
				this.warmupOnly = false;
			}
			// Process the Enter key
			if (evt.keyCode == 13 && !evt.shiftKey && this.app.workspace.activeEditor) {
				this.byEnter = true;
				(this.app as any).commands.executeCommandById('interactivity:execute');
				this.byEnter = false;
			}
		});

		// Add interactivity:execute command
		this.addCommand({
			id: 'execute',
			name: 'Execute shell command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const file = this.advanced ? (this.settings.separatedShells && view.file ? view.file.path : '*') : 'js';
				const cursor = editor.getCursor();

				if (Platform.isMobile) {
					cursor.line++;
					cursor.ch = 0;
				}

				if (typeof this.allSubprocesses[file] !== "undefined") {
					function routine(that: InteractivityPlugin, byEnter: boolean, ch: number) {
						const editor = that.app.workspace.activeEditor?.editor;
						if (!editor)
							return;

						let selection = editor.getSelection();
						let line = editor.getCursor().line;
						let command = '';
						let maxLen = 0;
						for (const x of that.settings.shortcuts.split('\n')) {
							let m = x.match(/(.*?)\s*->\s*(.*)/);
							if (m && m.length > 2 && maxLen < m[1].length && editor.getLine(cursor.line - (byEnter ? 1 : 0)).indexOf(m[1]) == 0) {
								command = m[2].replace(/##param##/g, editor.getLine(cursor.line - (byEnter ? 1 : 0)).slice(m[1].length));
								maxLen = m[1].length;
							}
						}

						if (command === '') {
							if (selection.length == 0)
								selection = editor.getLine(line);

							if ((selection.match(/\n/gm) || []).length) {
								let a = editor.listSelections()[0].anchor.line;
								let b = editor.listSelections()[0].head.line;

								if (a > b && editor.listSelections()[0].anchor.ch == 0)
									a--;
								if (a < b && editor.listSelections()[0].head.ch == 0)
									b--;

								let selections = [];
								for (let i = Math.min(a, b); i <= Math.max(a, b); i++)
									selections.push(editor.getLine(i));

								selection = selections.join('\n');
								line = Math.max(a, b);
							}
						}
						else
							selection = command;

						editor.setCursor({ 'line': line, 'ch': editor.getLine(line).length });

						if (selection.replace('\n', '').length) {
							if (that.advanced)
								that.allSubprocesses[file].stdin.write(selection + '\n');
							else {
								let output = "";
								try {
									output = __EVAL(selection);
								}
								catch (e) {
									output = e;
								}
								if (typeof output !== 'undefined' && that.processingNote === that.app.workspace.getActiveFile()?.path) {
									that.insertText(editor, output.toString(), that.settings.decorateMultiline, that.settings.prependOutput, that.settings.notice, that.advanced, that.removeLine);
									that.statusBarItemEl.setText('');
								}
							}
						}
					}

					const byEnter = this.byEnter; // We need to save a current state of byEnter
					const ch = editor.getCursor().ch;

					this.processingNote = this.app.workspace.getActiveFile()?.path ?? '';
					if (byEnter) {
						let command = ''; // This is used only to identify shortcuts, the command itself might be affected by a new line breaker
						for (const x of this.settings.shortcuts.split('\n')) {
							let m = x.match(/(.*?)\s*->\s*(.*)/);
							if (m && m.length > 2 && editor.getLine(cursor.line - (byEnter ? 1 : 0)).indexOf(m[1]) == 0) {
								command = m[2].replace(/##param##/g, editor.getLine(cursor.line - (byEnter ? 1 : 0)).slice(m[1].length));
								break;
							}
						}
						if (command === '')
							return;

						if (Platform.isMobile) {
							setTimeout((that: InteractivityPlugin, byEnter: boolean) => {
								editor.setCursor({ 'line': cursor.line - (byEnter ? 1 : 0), 'ch': editor.getLine(cursor.line - (byEnter ? 1 : 0)).length });
								that.statusBarItemEl.setText('Interactivity is busy⏳');
								routine(that, byEnter, ch);
								that.app.workspace.activeEditor?.editor?.setCursor({ 'line': cursor.line, 'ch': editor.getLine(cursor.line).length });
							}, 0, this, byEnter);
						}
						else {
							editor.replaceRange('', { 'line': cursor.line - (byEnter ? 1 : 0), 'ch': editor.getLine(cursor.line - (byEnter ? 1 : 0)).length }, { 'line': cursor.line, 'ch': cursor.ch });
							editor.setCursor({ 'line': cursor.line - (byEnter ? 1 : 0), 'ch': 0 });
							this.statusBarItemEl.setText('Interactivity is busy⏳');
							routine(this, byEnter, ch);
						}
					}
					else {
						this.statusBarItemEl.setText('Interactivity is busy⏳');
						routine(this, byEnter, ch);
					}
				}
			}
		});

		// Add interactivity:restart command
		this.addCommand({
			id: 'restart',
			name: 'Restart Shell',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (!this.warmupOnly) {
					const file = this.advanced ? (this.settings.separatedShells && view.file ? view.file.path : '*') : 'js';
					if (typeof this.allSubprocesses[file] !== "undefined") {
						if (this.advanced) {
							try {
								try {
									if (this.settings.executeOnUnload)
										this.allSubprocesses[file].stdin.write(this.settings.executeOnUnload + '\n');
								}
								catch (e) { }
								this.allSubprocesses[file].kill();
								delete this.allSubprocesses[file];
							}
							catch (e) { }
						}
					}
				}
				// Wait 350ms for subprocess to start up
				setTimeout((that: InteractivityPlugin) => {
					that.warmup(editor, view);
				}, this.warmupOnly ? 0 : 350, this);
			}
		});

		// Add the icon to the panel
		const ribbonIconEl = this.addRibbonIcon('activity', 'Run Interactivity', (evt: MouseEvent) => {
			(this.app as any).commands.executeCommandById('interactivity:execute');
			this.app.workspace.activeEditor?.editor?.focus()
		});

		// Add running status
		this.statusBarItemEl = this.addStatusBarItem();
		this.statusBarItemEl.setText('');

		this.warmupOnly = true;
		(this.app as any).commands.executeCommandById('interactivity:restart');
		this.warmupOnly = false;
	}

	onunload() {
		Object.entries(this.allSubprocesses).forEach(([file, s]) => {
			if (typeof this.allSubprocesses[file] !== "undefined") {
				if (this.advanced) {
					try {
						try {
							if (this.settings.executeOnUnload)
								this.allSubprocesses[file].stdin.write(this.settings.executeOnUnload + '\n');
						}
						catch (e) { }
						this.allSubprocesses[file].kill();
						delete this.allSubprocesses[file];
					}
					catch (e) { }
				}
			}
		});
		this.allSubprocesses = {};
	}

	// Remove line from the editor
	removeLine(editor: Editor, lineNumber: number) {
		let ret = '';
		let cur = editor.getCursor();
		if (cur.line >= lineNumber)
			cur.line--;
		editor.getValue().split('\n').forEach((line, i) => {
			if (i != lineNumber)
				ret += line + '\n';
		});
		editor.setValue(ret.slice(0, -1));
		editor.setCursor(cur);
	}

	// Prepare the subprocess
	warmup(editor: Editor, view: MarkdownView) {
		const file = this.advanced ? (this.settings.separatedShells && view.file ? view.file.path : '*') : 'js';
		if (typeof this.allSubprocesses[file] === "undefined") {
			if (this.advanced) {
				const cp = require('child_process');
				if (typeof cp === 'undefined') {
					new Notice('Unable to run subprocess');
					return;
				}
				const p = this.app.vault.adapter instanceof FileSystemAdapter ? normalizePath((this.app.vault.adapter as FileSystemAdapter).getBasePath() + '/' + this.manifest.dir + '/1').slice(0, -1) : "";
				const params = this.settings.shellParams ? this.settings.shellParams.replace(/##plugin##/g, p).split('\n') : [];
				let enviromentVariables: { [key: string]: string } = {};
				this.settings.enviromentVariables.replace(/##plugin##/g, p).split('\n').forEach((line) => {
					const lines = line.split('=');
					if (lines.length > 1)
						enviromentVariables[lines[0]] = lines[1];
				});

				this.allSubprocesses[file] = cp.spawn(this.settings.shellExec.replace(/##plugin##/g, p), params, { env: enviromentVariables });

				this.allSubprocesses[file].stdin.setEncoding('utf-8');
				this.allSubprocesses[file].stdout.setEncoding('utf-8');
				this.allSubprocesses[file].stderr.setEncoding('utf-8');

				if (this.settings.executeOnLoad && this.advanced)
					this.allSubprocesses[file].stdin.write(this.settings.executeOnLoad + '\n');

				let stringsOmitted = 0;
				const that = this;
				const workspace = this.app.workspace;

				let process = function (data: string) {
					if (stringsOmitted < that.settings.linesToSuppress && that.advanced) {
						stringsOmitted++;
						return;
					}
					data = data.replace(new RegExp(that.settings.regexpCleaner, 'mg'), '');
					if (data.length && that.processingNote === that.app.workspace.getActiveFile()?.path) {
						if (workspace.activeEditor?.editor)
							that.insertText(workspace.activeEditor.editor, data, that.settings.decorateMultiline, that.settings.prependOutput, that.settings.notice, that.advanced, that.removeLine);
						that.statusBarItemEl.setText('');
					}
				};

				this.allSubprocesses[file].stdout.on("data", process);
				this.allSubprocesses[file].stderr.on("data", process);
			}
			else
				this.allSubprocesses[file] = true;
		}
	}

	// Add the output to the editor
	insertText(editor: Editor, data: string, decorateMultiline: boolean, prependOutput: string, toNotice: boolean, advanced: boolean, removeLine: Function) {
		if (toNotice)
			new Notice(data);
		else {
			const outLines = (data.match(/\n/gm) || []).length + 1;

			data = data.replace(/\r/mg, '');
			if (decorateMultiline)
				data = data.replace(/(^|[^\\])\n(?!\n*$)/g, (match: string, p1: string) => p1 + '\n' + prependOutput);
			editor.replaceRange('\n' + prependOutput + data.replace(/\n$/mg, ''), editor.getCursor());
			editor.setCursor({ 'line': editor.getCursor().line + outLines - (advanced ? 1 : 0), 'ch': editor.getLine(editor.getCursor().line + outLines - (advanced ? 1 : 0)).length });
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Get ready to apply new settings
		this.onunload();
	}

	async saveSettings() {
		this.advanced = Platform.isMobile ? false : this.settings.advanced;
		await this.saveData(this.settings);
	}
}

class InteractivitySettingTab extends PluginSettingTab {
	plugin: InteractivityPlugin;

	constructor(app: App, plugin: InteractivityPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		this.plugin.modal = false;
	}

	display(): void {
		this.plugin.modal = true;

		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Use notifications instead of appending the output to the Obsidian notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.notice)
				.onChange(async (value) => {
					this.plugin.settings.notice = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Decorate output')
			.setDesc('Prepend the output with custom text')
			.addText(text => text
				.setPlaceholder('Prepending text')
				.setValue(this.plugin.settings.prependOutput)
				.onChange(async (value) => {
					this.plugin.settings.prependOutput = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Decorate each line of the output')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.decorateMultiline)
				.onChange(async (value) => {
					this.plugin.settings.decorateMultiline = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Text shortcuts that run commands, one per line')
			.setDesc('Define text shortcuts for running commands. The text before \'->\' is the shortcut; the text after is the command to execute. Use ##param## to include the line after the shortcut in the command. Press Shift+Enter for a new line without triggering the shortcut.')
			.addTextArea(text => text
				.setPlaceholder('shortcut->command(##param##)')
				.setValue(this.plugin.settings.shortcuts)
				.onChange(async (value) => {
					this.plugin.settings.shortcuts = value;
					await this.plugin.saveSettings();
				}));


		if (!Platform.isMobile) {
			new Setting(containerEl)
				.setName('Advanced options')
				.setDesc('Use external executables instead of JavaScript (unsafe!)')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.advanced)
					.onChange(async (value) => {
						this.plugin.settings.advanced = value;
						await this.plugin.saveSettings();

						if (this.plugin.settings.advanced) {
						    shellExecEl.settingEl.removeClass('hidden');
						    enviromentVariablesEl.settingEl.removeClass('hidden');
						    shellParamsEl.settingEl.removeClass('hidden');
						    executeOnLoadEl.settingEl.removeClass('hidden');
						    executeOnUnloadEl.settingEl.removeClass('hidden');
						    separatedShellsEl.settingEl.removeClass('hidden');
						    regexpCleanerEl.settingEl.removeClass('hidden');
						    linesToSuppressEl.settingEl.removeClass('hidden');
						} else {
						    shellExecEl.settingEl.addClass('hidden');
						    enviromentVariablesEl.settingEl.addClass('hidden');
						    shellParamsEl.settingEl.addClass('hidden');
						    executeOnLoadEl.settingEl.addClass('hidden');
						    executeOnUnloadEl.settingEl.addClass('hidden');
						    separatedShellsEl.settingEl.addClass('hidden');
						    regexpCleanerEl.settingEl.addClass('hidden');
						    linesToSuppressEl.settingEl.addClass('hidden');
						}
					}));

			// Advanced options
			const shellExecEl = new Setting(containerEl)
				.setName('Shell executable path')
				.setDesc('Specify the path to the shell executable. Use ##plugin## to refer to the plugin\'s directory.')
				.addText(text => text
					.setPlaceholder('Path')
					.setValue(this.plugin.settings.shellExec)
					.onChange(async (value) => {
						this.plugin.settings.shellExec = value;
						await this.plugin.saveSettings();
					}));

			const enviromentVariablesEl = new Setting(containerEl)
				.setName('Enviroment variables, one per line')
				.setDesc('Set environment variables. Use ##plugin## to refer to the plugin\'s directory.')
				.addTextArea(text => text
					.setPlaceholder('Enviroment variables')
					.setValue(this.plugin.settings.enviromentVariables)
					.onChange(async (value) => {
						this.plugin.settings.enviromentVariables = value;
						await this.plugin.saveSettings();
					}));

			const shellParamsEl = new Setting(containerEl)
				.setName('Shell CLI arguments, one per line')
				.setDesc('Specify shell command-line arguments. Use ##plugin## to refer to the plugin\'s directory')
				.addTextArea(text => text
					.setPlaceholder('Shell arguments')
					.setValue(this.plugin.settings.shellParams)
					.onChange(async (value) => {
						this.plugin.settings.shellParams = value;
						await this.plugin.saveSettings();
					}));


			const executeOnLoadEl = new Setting(containerEl)
				.setName('Commands to run after starting the shell')
				.addTextArea(text => text
					.setPlaceholder('Shell input')
					.setValue(this.plugin.settings.executeOnLoad)
					.onChange(async (value) => {
						this.plugin.settings.executeOnLoad = value;
						await this.plugin.saveSettings();
					}));

			const executeOnUnloadEl = new Setting(containerEl)
				.setName('Commands to run before closing the shell')
				.setDesc('Not executable when closing Obsidian')
				.addTextArea(text => text
					.setPlaceholder('Shell input')
					.setValue(this.plugin.settings.executeOnUnload)
					.onChange(async (value) => {
						this.plugin.settings.executeOnUnload = value;
						await this.plugin.saveSettings();
					}));

			const separatedShellsEl = new Setting(containerEl)
				.setName('Enable separate shell sessions for each note')
				.setDesc('Requires more memory')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.separatedShells)
					.onChange(async (value) => {
						this.plugin.settings.separatedShells = value;
						await this.plugin.saveSettings();
					}));

			const regexpCleanerEl = new Setting(containerEl)
				.setName('Apply a RegExp pattern to filter the output')
				.addText(text => text
					.setPlaceholder('RegExp pattern')
					.setValue(this.plugin.settings.regexpCleaner)
					.onChange(async (value) => {
						this.plugin.settings.regexpCleaner = value;
						await this.plugin.saveSettings();
					}));

			const linesToSuppressEl = new Setting(containerEl)
				.setName('Specify the number of initial lines to suppress')
				.setDesc('e.g., number of lines in shell greetings')
				.addText(text => text
					.setPlaceholder('Amount of first lines')
					.setValue(String(this.plugin.settings.linesToSuppress))
					.onChange(async (value) => {
						this.plugin.settings.linesToSuppress = parseInt(value);
						await this.plugin.saveSettings();
					}));

			if (this.plugin.settings.advanced) {
			    shellExecEl.settingEl.removeClass('hidden');
			    enviromentVariablesEl.settingEl.removeClass('hidden');
			    shellParamsEl.settingEl.removeClass('hidden');
			    executeOnLoadEl.settingEl.removeClass('hidden');
			    executeOnUnloadEl.settingEl.removeClass('hidden');
			    separatedShellsEl.settingEl.removeClass('hidden');
			    regexpCleanerEl.settingEl.removeClass('hidden');
			    linesToSuppressEl.settingEl.removeClass('hidden');
			} else {
			    shellExecEl.settingEl.addClass('hidden');
			    enviromentVariablesEl.settingEl.addClass('hidden');
			    shellParamsEl.settingEl.addClass('hidden');
			    executeOnLoadEl.settingEl.addClass('hidden');
			    executeOnUnloadEl.settingEl.addClass('hidden');
			    separatedShellsEl.settingEl.addClass('hidden');
			    regexpCleanerEl.settingEl.addClass('hidden');
			    linesToSuppressEl.settingEl.addClass('hidden');
			}
		}
	}
}
