import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, normalizePath } from 'obsidian';

// Remember to rename these classes and interfaces!

interface InteractivityPluginSettings {
	shellExec: string;
	shellParams: string;
	startupInput: string;
	keyword: string;
	lineKeyword: string;
	notice:  boolean;
	byEnter:  boolean;
	decorateMultiline:  boolean;
	omitStrings: number;
	separatedShells:  boolean;	
	prependOutput: string;
	enviromentVariables: string;
	executeOnUnload: string;
	regexpCleaner: string;
	advanced: boolean;
}

const DEFAULT_SETTINGS: InteractivityPluginSettings = {
	shellExec: 'python',
	shellParams: '-iq\n##plugin##basics.py\n',
	startupInput: 'openai.api_key = "sk-"\nload()\n',
	keyword: '```i',
	lineKeyword: '@@',
	notice: false,
	byEnter: true,
	decorateMultiline: true,
	omitStrings: 1,
	separatedShells: false,	
	prependOutput: '>>> ',
	enviromentVariables: "PYTHONIOENCODING=utf8\n",
	executeOnUnload: "save()\nexit()\n",
	regexpCleaner: '^((>>> )|(\.\.\. ))+',
	advanced: false
}

const __EVAL = s => eval(`void (__EVAL = ${__EVAL.toString()}); ${s}`);

export default class InteractivityPlugin extends Plugin {
	settings: InteractivityPluginSettings;
	allSubprocesses: Object = {};
	byEnter: boolean = false;
	warmupOnly: boolean = false;
	modal: boolean = false;
	advanced: boolean = false;

	async onload() {
		await this.loadSettings();

		this.advanced = this.app.isMobile ? false : this.settings.advanced;

		this.addSettingTab(new InteractivitySettingTab(this.app, this));

		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			// To be sure that subprocess is ready before user runs any command
			if (!this.modal) {
				this.warmupOnly = true;
				this.app['commands'].executeCommandById('interactivity:interactivity-restart');
				this.warmupOnly = false;
			}
			// Process the Enter key
			if (evt.keyCode == 13 && !evt.shiftKey && this.app.workspace.activeEditor && this.settings.byEnter) {
				this.byEnter = true;
				this.app['commands'].executeCommandById('interactivity:interactivity-execute');
				this.byEnter = false;
			}
		});

		// Add interactivity:interactivity-execute command
		this.addCommand({
			id: 'interactivity-execute',
			name: 'Execute shell command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
		        const file = this.advanced ? (this.settings.separatedShells ? view.file.path : '*') : 'js';
				const cursor = editor.getCursor();

				if (this.app.isMobile) {
					cursor.line++;
					cursor.ch = 0;
				}

				if (
					typeof this.allSubprocesses[file] !== "undefined" &&
					(
						this.byEnter && this.settings.documentKeyword && editor.getValue().search(new RegExp('\n' + this.settings.documentKeyword + '\n', 'gi')) > -1 ||
						this.byEnter && this.settings.documentKeyword && editor.getValue().search(new RegExp(this.settings.documentKeyword + '\n', 'gi')) == 0 ||
						this.byEnter && this.settings.lineKeyword && editor.getLine(cursor.line - 1).search(new RegExp(this.settings.lineKeyword)) == 0 ||
						!this.byEnter
						)
					) {
			        function routine(editor: Editor, that) {
						let selection = editor.getSelection();
						let line = editor.getCursor().line;

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
						// let line_offset = 0;
						// while (true) {
						// 	if (selection && selection[selection.length - 1] == '\n') {
						// 		selection = selection.substring(0, selection.length - 1);
						// 		line_offset++;
						// 	}
						// 	else
						// 		break;
						// }
						// line -= line_offset;

						editor.setCursor({'line': line, 'ch': editor.getLine(line).length});

						selection = selection
							.replace(new RegExp('\n' + that.settings.lineKeyword + '|\n' + that.settings.documentKeyword, 'mg'), '\n')
							.replace(new RegExp('^' + that.settings.lineKeyword + '|^' + that.settings.documentKeyword, 'mg'), '');
						if (selection.replace('\n', '').length) {
							if (that.advanced)
								that.allSubprocesses[file].stdin.write(selection + '\n');
							else {
								let output = "";
								try {
									output = __EVAL(selection);
								}
								catch(e) {
									output = e;
								}
								if (typeof output !== 'undefined')
									that.insertText(editor, output.toString(), that.settings.decorateMultiline, that.settings.prependOutput, that.settings.toNotice, that.advanced, that.removeLine);
							}
						}
						// selection.split('\n').forEach((line) => {
						// 	if (line != this.settings.documentKeyword) {
						// 		if (this.settings.lineKeyword)
						// 			line = line.replace(new RegExp('^' + this.settings.lineKeyword), '');
						// 		if (this.advanced)
						// 			this.allSubprocesses[file].stdin.write(line + '\n');
						// 		else {
						// 			let output = "";
						// 			try {
						// 				output = __EVAL(line).toString();
						// 			}
						// 			catch(e) {
						// 				output = e.toString();
						// 			}
						// 			this.insertText(editor, output, this.settings.decorateMultiline, this.settings.prependOutput, this.settings.toNotice, this.advanced, that.removeLine);
						// 		}
						// 	}
						// });
			        }

					// avoid new lines in the middle of a string
					if (this.byEnter && editor.getLine(cursor.line - 1).search(new RegExp(this.settings.lineKeyword)) == 0) {
						if (this.app.isMobile) {
							editor.setCursor({'line': cursor.line - 1, 'ch': editor.getLine(cursor.line - 1).length});
							setTimeout((that) => {
								editor.setCursor({'line': cursor.line - 1, 'ch': editor.getLine(cursor.line - 1).length});
								routine(editor, that);
								that.removeLine(editor, cursor.line + 1);
								that.removeLine(editor, cursor.line + 1);
								that.app.workspace.activeEditor.editor.setCursor({'line': cursor.line, 'ch': editor.getLine(cursor.line).length});
							}, 0, this);
						}
						else {
							editor.replaceRange('', {'line': cursor.line - 1, 'ch': editor.getLine(cursor.line - 1).length}, {'line': cursor.line, 'ch': cursor.ch});
							editor.setCursor({'line': cursor.line - 1, 'ch': 0});
					        routine(editor, this);
					    }
			        }
			        else
			        	routine(editor, this);
				}
			}
		});

		// Add interactivity:interactivity-restart command
		this.addCommand({
			id: 'interactivity-restart',
			name: 'Restart Shell',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (!this.warmupOnly) {
			        const file = this.advanced ? (this.settings.separatedShells ? view.file.path : '*') : 'js';
					if (typeof this.allSubprocesses[file] !== "undefined") {
						if (this.advanced) {
							try {
								this.allSubprocesses[file].stdin.write('\'%kill_routine%\'\n' + this.settings.executeOnUnload + '\n');
							}
							catch(e) { }
							setTimeout((that) => {
								try {
									that.allSubprocesses[file].kill();
									delete that.allSubprocesses[file];
								}
								catch(e) { }
							}, 300, this);
						}
						// else {
						// 	if (this.settings.executeOnUnload)
						// 		try {
						// 			__EVAL(this.settings.executeOnUnload); // output is not needed
						// 		}
						// 		catch(e) { }
						// }
					}
				}
				// Wait 350ms for subprocess to start up
				setTimeout((that) => {
					that.warmup(editor, view);
				}, this.warmupOnly ? 0 : 350, this);
			}
		});

		// Add the icon to the panel
		const ribbonIconEl = this.addRibbonIcon('activity', 'Run Interactivity', (evt: MouseEvent) => {
			this.app['commands'].executeCommandById('interactivity:interactivity-execute');
		});

	}

	onunload() {
		Object.entries(this.allSubprocesses).forEach(([file, s]) => {
			if (typeof this.allSubprocesses[file] !== "undefined") {
				if (this.advanced) {
					this.allSubprocesses[file].stdin.write('\'%kill_routine%\'\n' + (this.settings.executeOnUnload ? this.settings.executeOnUnload + '\n' : ''));

					// Wait 350ms for subprocess to shut down
					setTimeout((that) => {
						try {
							that.allSubprocesses[file].kill();
							delete that.allSubprocesses[file];
						}
						catch(e) { }
					}, 350, this);
				}
				else {
					if (this.settings.executeOnUnload)
						try {
							__EVAL(this.settings.executeOnUnload); // output is not needed
						}
						catch(e) { }
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
        const file = this.advanced ? (this.settings.separatedShells ? view.file.path : '*') : 'js';
		if (typeof this.allSubprocesses[file] === "undefined") {
			if (this.advanced) {
				const cp = require('child_process');
				if (typeof cp === 'undefined') {
					new Notice('Unable to run subprocess');
					return;
				}
				const p = normalizePath(this.app.vault['adapter']['basePath'] + '/' + this.app.vault['configDir'] + '/plugins/interactivity/1').slice(0, -1);
				const params = this.settings.shellParams ? this.settings.shellParams.replace('##plugin##', p).split('\n') : [];
				let enviromentVariables = {};
				this.settings.enviromentVariables.replace('##plugin##', p).split('\n').forEach((line) => {
					const lines = line.split('=');
					if (lines.length > 1)
						enviromentVariables[lines[0]] = lines[1];
				});

				this.allSubprocesses[file] = cp.spawn(this.settings.shellExec.replace('##plugin##', p), params, {env: enviromentVariables});

				this.allSubprocesses[file].stdin.setEncoding('utf-8');
				this.allSubprocesses[file].stdout.setEncoding('utf-8');
				this.allSubprocesses[file].stderr.setEncoding('utf-8');

				if (this.settings.executeOnLoad && this.advanced)
					this.allSubprocesses[file].stdin.write(this.settings.executeOnLoad + '\n');

				let stringsOmitted = 0;
				let stdin_flag = true;
				const insertText = this.insertText;
				const stdin = this.allSubprocesses[file].stdin;
				const omitStrings = this.settings.omitStrings;
				const toNotice = this.settings.notice;
				const prependOutput = this.settings.prependOutput;
				const regexpCleaner = this.settings.regexpCleaner;
				const decorateMultiline = this.settings.decorateMultiline;
				const advanced = this.advanced;
				const removeLine = this.removeLine;

				let process = function(data) {
					if (stringsOmitted < omitStrings && advanced) {
						stringsOmitted++;
						return;
					}
					data = data.replace(new RegExp(regexpCleaner, 'mg'), '');
					if (data.search('\'%kill_routine%\'') == 0) {
						stdin.end();
						stdin_flag = false;
					} else if (data.length && stdin_flag !== false)
						insertText(editor, data, decorateMultiline, prependOutput, toNotice, advanced, removeLine);
				};

				this.allSubprocesses[file].stdout.on("data", process);
				this.allSubprocesses[file].stderr.on("data", process);
			}
			else
				this.allSubprocesses[file] = true;
		}
	}

	// Add the output to the editor
	insertText(editor, data, decorateMultiline, prependOutput, toNotice, advanced, removeLine) {
		if (toNotice)
			new Notice(data);
		else {
			const outLines = (data.match(/\n/gm) || []).length + 1;
			if (decorateMultiline)
				data = data.replace(/(?<!\\)\n(?!$)/mg, '\n' + prependOutput);
			if (!advanced)
				data = '\n' + data;
			editor.replaceRange('\n' + prependOutput + data.replace(/\n$/mg, ''), editor.getCursor());
			removeLine(editor, editor.getCursor().line + outLines);
			editor.setCursor({'line': editor.getCursor().line + outLines - (advanced ? 1 : 0), 'ch': editor.getLine(editor.getCursor().line + outLines - (advanced ? 1 : 0)).length});
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Get ready to apply new settings
		this.onunload();
	}

	async saveSettings() {
		this.advanced = this.app.isMobile ? false : this.settings.advanced;
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
		this.app['commands'].executeCommandById('interactivity:interactivity-execute');
		this.plugin.modal = false;
	}

	display(): void {
		this.plugin.modal = true;

		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Interactivity settings'});

	    new Setting(containerEl)
			.setName('Use notifications instead of appending the output to the Obsidian notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.notice)
				.onChange(async (value) => {
					this.plugin.settings.notice = value;
					await this.plugin.saveSettings();
				}));

	    new Setting(containerEl)
			.setName('Execute by pressing Enter key (use Shift+Enter to insert new lines if needed)')
			.setDesc('You will still be able to directly call the plugin\'s command (e.g. by using hotkeys)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.byEnter)
				.onChange(async (value) => {
					this.plugin.settings.byEnter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Do not execute by pressing the Enter key if the keyword is not found in the current Obsidian note')
			.setDesc('You will still be able to directly call the plugin\'s command (e.g. by using hotkeys)')
			.addText(text => text
				.setPlaceholder('RegExp pattern')
				.setValue(this.plugin.settings.documentKeyword)
				.onChange(async (value) => {
					this.plugin.settings.documentKeyword = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Do not execute by pressing the Enter key if the keyword is not found in the current line')
			.setDesc('You will still be able to directly call the plugin\'s command (e.g. by using hotkeys)')
			.addText(text => text
				.setPlaceholder('RegExp pattern')
				.setValue(this.plugin.settings.lineKeyword)
				.onChange(async (value) => {
					this.plugin.settings.lineKeyword = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Decorate output')
			.setDesc('This setting prepends the output with the desired text')
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

		if (!this.app.isMobile) {
		    new Setting(containerEl)
				.setName('Advanced options')
				.setDesc('Use external executables instead of JavaScript (unsafe!)')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.advanced)
					.onChange(async (value) => {
						this.plugin.settings.advanced = value;
						await this.plugin.saveSettings();

						shellExecEl.settingEl.style['display'] = value ? 'flex' : 'none';
						enviromentVariablesEl.settingEl.style['display'] = value ? 'flex' : 'none';
						shellParamsEl.settingEl.style['display'] = value ? 'flex' : 'none';
						executeOnLoadEl.settingEl.style['display'] = value ? 'flex' : 'none';
						executeOnUnloadEl.settingEl.style['display'] = value ? 'flex' : 'none';
						separatedShellsEl.settingEl.style['display'] = value ? 'flex' : 'none';
						regexpCleanerEl.settingEl.style['display'] = value ? 'flex' : 'none';
						omitStringsEl.settingEl.style['display'] = value ? 'flex' : 'none';
					}));

			// Advanced options
			const shellExecEl = new Setting(containerEl)
				.setName('Shell executable path')
				.setDesc('Use ##plugin## template if you need to specify plugin\'s directory')
				.addText(text => text
					.setPlaceholder('Path')
					.setValue(this.plugin.settings.shellExec)
					.onChange(async (value) => {
						this.plugin.settings.shellExec = value;
						await this.plugin.saveSettings();
					}));

			const enviromentVariablesEl = new Setting(containerEl)
				.setName('Enviroment variables separated by lines')
				.setDesc('Use ##plugin## template if you need to specify plugin\'s directory')
				.addTextArea(text => text
					.setPlaceholder('Enviroment variables')
					.setValue(this.plugin.settings.enviromentVariables)
					.onChange(async (value) => {
						this.plugin.settings.enviromentVariables = value;
						await this.plugin.saveSettings();
					}));

			const shellParamsEl = new Setting(containerEl)
				.setName('Shell CLI arguments separated by lines')
				.setDesc('Use ##plugin## template if you need to specify plugin\'s directory')
				.addTextArea(text => text
					.setPlaceholder('Shell arguments')
					.setValue(this.plugin.settings.shellParams)
					.onChange(async (value) => {
						this.plugin.settings.shellParams = value;
						await this.plugin.saveSettings();
					}));


			const executeOnLoadEl = new Setting(containerEl)
				.setName('Execute after starting')
				.addTextArea(text => text
					.setPlaceholder('Shell input')
					.setValue(this.plugin.settings.executeOnLoad)
					.onChange(async (value) => {
						this.plugin.settings.executeOnLoad = value;
						await this.plugin.saveSettings();
					}));

			const executeOnUnloadEl = new Setting(containerEl)
				.setName('Execute before closing')
				.setDesc('Cannot execute when the Obsidian is closing')
				.addTextArea(text => text
					.setPlaceholder('Shell input')
					.setValue(this.plugin.settings.executeOnUnload)
					.onChange(async (value) => {
						this.plugin.settings.executeOnUnload = value;
						await this.plugin.saveSettings();
					}));

		    const separatedShellsEl = new Setting(containerEl)
				.setName('Use separate shell sessions for each Obsidian note')
				.setDesc('Requires more memory if on')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.separatedShells)
					.onChange(async (value) => {
						this.plugin.settings.separatedShells = value;
						await this.plugin.saveSettings();
					}));

			const regexpCleanerEl = new Setting(containerEl)
				.setName('Filter the output with the RegExp pattern')
				.addText(text => text
					.setPlaceholder('RegExp pattern')
					.setValue(this.plugin.settings.regexpCleaner)
					.onChange(async (value) => {
						this.plugin.settings.regexpCleaner = value;
						await this.plugin.saveSettings();
					}));

			const omitStringsEl = new Setting(containerEl)
				.setName('Number of first lines to skip')
				.setDesc('You might want to skip greetings from your shell')
				.addText(text => text
					.setPlaceholder('Amount of first lines')
					.setValue(String(this.plugin.settings.omitStrings))
					.onChange(async (value) => {
						this.plugin.settings.omitStrings = parseInt(value);
						await this.plugin.saveSettings();
					}));

			shellExecEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
			enviromentVariablesEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
			shellParamsEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
			executeOnLoadEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
			executeOnUnloadEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
			separatedShellsEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
			regexpCleanerEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
			omitStringsEl.settingEl.style['display'] = this.plugin.settings.advanced ? 'flex' : 'none';
		}
	}
}
