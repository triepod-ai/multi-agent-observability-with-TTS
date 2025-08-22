/**
 * Themes Command
 * Manage UI themes - list, search, create, export, import
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import inquirer from 'inquirer';

export class ThemesCommand {
  constructor(cli) {
    this.cli = cli;
  }

  async execute(options = {}) {
    if (options.list) {
      await this.listThemes();
      return;
    }

    if (options.search) {
      await this.searchThemes(options.search);
      return;
    }

    if (options.create) {
      await this.createTheme(options.create);
      return;
    }

    if (options.export) {
      await this.exportTheme(options.export);
      return;
    }

    if (options.import) {
      await this.importTheme(options.import);
      return;
    }

    if (options.stats) {
      await this.showThemeStats();
      return;
    }

    // Interactive theme management
    await this.showThemeMenu();
  }

  async showThemeMenu() {
    const choices = [
      { name: 'List available themes', value: 'list' },
      { name: 'Search themes', value: 'search' },
      { name: 'Create new theme', value: 'create' },
      { name: 'Export theme', value: 'export' },
      { name: 'Import theme', value: 'import' },
      { name: 'Show theme statistics', value: 'stats' },
      { name: 'Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Theme management:',
        choices
      }
    ]);

    switch (action) {
      case 'list':
        await this.listThemes();
        break;
      case 'search':
        await this.interactiveSearch();
        break;
      case 'create':
        await this.interactiveCreate();
        break;
      case 'export':
        await this.interactiveExport();
        break;
      case 'import':
        await this.interactiveImport();
        break;
      case 'stats':
        await this.showThemeStats();
        break;
      case 'exit':
        return;
    }
  }

  async listThemes() {
    const spinner = this.cli.createSpinner('Fetching themes...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', '/api/themes?limit=50');
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch themes: ${result.error}`);
        return;
      }

      const themes = result.data?.themes || [];

      this.cli.print('');
      this.cli.print(chalk.bold.magenta('🎨 Available Themes'));
      this.cli.print(chalk.gray('═══════════════════'));
      this.cli.print('');

      if (themes.length === 0) {
        this.cli.printInfo('No themes found');
        return;
      }

      themes.forEach((theme, index) => {
        this.displayTheme(theme, index + 1);
      });

      this.cli.print('');
      this.cli.print(chalk.gray(`Total themes: ${themes.length}`));

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to list themes: ${error.message}`);
    }
  }

  displayTheme(theme, index) {
    const visibility = theme.isPublic ? chalk.green('Public') : chalk.yellow('Private');
    const createdDate = new Date(theme.createdAt).toLocaleDateString();
    
    this.cli.print(chalk.bold.white(`[${index}] ${theme.displayName}`));
    this.cli.print(`  ${chalk.gray('ID:')} ${chalk.cyan(theme.id)}`);
    this.cli.print(`  ${chalk.gray('Name:')} ${chalk.yellow(theme.name)}`);
    this.cli.print(`  ${chalk.gray('Visibility:')} ${visibility}`);
    this.cli.print(`  ${chalk.gray('Author:')} ${chalk.magenta(theme.authorName || theme.authorId || 'Unknown')}`);
    this.cli.print(`  ${chalk.gray('Created:')} ${chalk.blue(createdDate)}`);
    
    if (theme.description) {
      this.cli.print(`  ${chalk.gray('Description:')} ${theme.description}`);
    }
    
    if (theme.downloadCount) {
      this.cli.print(`  ${chalk.gray('Downloads:')} ${chalk.green(theme.downloadCount)}`);
    }
    
    if (theme.rating && theme.ratingCount) {
      const stars = '★'.repeat(Math.round(theme.rating));
      this.cli.print(`  ${chalk.gray('Rating:')} ${chalk.yellow(stars)} ${chalk.gray(`(${theme.ratingCount})`)}`);
    }
    
    this.cli.print('');
  }

  async searchThemes(query) {
    const spinner = this.cli.createSpinner(`Searching themes for "${query}"...`);
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', `/api/themes?query=${encodeURIComponent(query)}&limit=20`);
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Search failed: ${result.error}`);
        return;
      }

      const themes = result.data?.themes || [];

      this.cli.print('');
      this.cli.print(chalk.bold.blue(`🔍 Search Results for "${query}"`));
      this.cli.print(chalk.gray('═'.repeat(30 + query.length)));
      this.cli.print('');

      if (themes.length === 0) {
        this.cli.printWarning('No themes found matching your search');
        return;
      }

      themes.forEach((theme, index) => {
        this.displayTheme(theme, index + 1);
      });

      this.cli.print(chalk.gray(`Found ${themes.length} themes`));

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Search failed: ${error.message}`);
    }
  }

  async createTheme(filePath) {
    try {
      this.cli.print('');
      this.cli.print(chalk.bold.green('🎨 Creating New Theme'));
      this.cli.print(chalk.gray('════════════════════════'));
      this.cli.print('');

      let themeData;
      
      if (filePath) {
        // Load theme from file
        const fileContent = await fs.readFile(filePath, 'utf8');
        themeData = JSON.parse(fileContent);
        this.cli.printSuccess(`Loaded theme from ${filePath}`);
      } else {
        // Interactive theme creation
        themeData = await this.interactiveThemeCreation();
      }

      const spinner = this.cli.createSpinner('Creating theme...');
      spinner.start();

      const result = await this.cli.apiRequest('POST', '/api/themes', themeData);
      spinner.stop();

      if (result.success) {
        this.cli.printSuccess('Theme created successfully!');
        this.cli.print(`  Theme ID: ${chalk.cyan(result.data.theme.id)}`);
        this.cli.print(`  Name: ${chalk.yellow(result.data.theme.name)}`);
      } else {
        this.cli.printError(`Failed to create theme: ${result.error}`);
        
        if (result.data?.validationErrors) {
          this.cli.print('');
          this.cli.print(chalk.red('Validation errors:'));
          result.data.validationErrors.forEach(error => {
            this.cli.print(`  ${chalk.red('•')} ${error.field}: ${error.message}`);
          });
        }
      }

    } catch (error) {
      this.cli.printError(`Failed to create theme: ${error.message}`);
    }
  }

  async interactiveThemeCreation() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Theme name (slug):',
        validate: input => input.length > 0 || 'Name is required'
      },
      {
        type: 'input',
        name: 'displayName',
        message: 'Display name:',
        validate: input => input.length > 0 || 'Display name is required'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):'
      },
      {
        type: 'confirm',
        name: 'isPublic',
        message: 'Make theme public?',
        default: false
      },
      {
        type: 'input',
        name: 'authorName',
        message: 'Author name:'
      }
    ]);

    // Generate basic color scheme
    const colors = await this.generateColorScheme();

    return {
      ...answers,
      colors,
      tags: ['custom', 'cli-generated']
    };
  }

  async generateColorScheme() {
    const { colorScheme } = await inquirer.prompt([
      {
        type: 'list',
        name: 'colorScheme',
        message: 'Choose color scheme:',
        choices: [
          { name: 'Dark Blue', value: 'dark-blue' },
          { name: 'Dark Green', value: 'dark-green' },
          { name: 'Light Gray', value: 'light-gray' },
          { name: 'Custom', value: 'custom' }
        ]
      }
    ]);

    const schemes = {
      'dark-blue': {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        primaryLight: '#60a5fa',
        primaryDark: '#1d4ed8',
        bgPrimary: '#0f172a',
        bgSecondary: '#1e293b',
        bgTertiary: '#334155',
        bgQuaternary: '#475569',
        textPrimary: '#f8fafc',
        textSecondary: '#e2e8f0',
        textTertiary: '#cbd5e1',
        textQuaternary: '#94a3b8',
        borderPrimary: '#334155',
        borderSecondary: '#475569',
        borderTertiary: '#64748b',
        accentSuccess: '#10b981',
        accentWarning: '#f59e0b',
        accentError: '#ef4444',
        accentInfo: '#06b6d4',
        shadow: 'rgba(0, 0, 0, 0.1)',
        shadowLg: 'rgba(0, 0, 0, 0.25)',
        hoverBg: '#475569',
        activeBg: '#64748b',
        focusRing: '#3b82f6'
      },
      'dark-green': {
        primary: '#10b981',
        primaryHover: '#059669',
        primaryLight: '#34d399',
        primaryDark: '#047857',
        bgPrimary: '#064e3b',
        bgSecondary: '#065f46',
        bgTertiary: '#047857',
        bgQuaternary: '#059669',
        textPrimary: '#ecfdf5',
        textSecondary: '#d1fae5',
        textTertiary: '#a7f3d0',
        textQuaternary: '#6ee7b7',
        borderPrimary: '#047857',
        borderSecondary: '#059669',
        borderTertiary: '#10b981',
        accentSuccess: '#10b981',
        accentWarning: '#f59e0b',
        accentError: '#ef4444',
        accentInfo: '#06b6d4',
        shadow: 'rgba(0, 0, 0, 0.1)',
        shadowLg: 'rgba(0, 0, 0, 0.25)',
        hoverBg: '#059669',
        activeBg: '#10b981',
        focusRing: '#10b981'
      }
    };

    if (colorScheme === 'custom') {
      // For simplicity, return dark-blue for custom
      // In a real implementation, you'd prompt for each color
      return schemes['dark-blue'];
    }

    return schemes[colorScheme] || schemes['dark-blue'];
  }

  async exportTheme(themeId) {
    const spinner = this.cli.createSpinner(`Exporting theme ${themeId}...`);
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', `/api/themes/${themeId}/export`);
      spinner.stop();

      if (result.success) {
        this.cli.print(JSON.stringify(result.data, null, 2));
      } else {
        this.cli.printError(`Failed to export theme: ${result.error}`);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Export failed: ${error.message}`);
    }
  }

  async importTheme(filePath) {
    try {
      this.cli.print('');
      this.cli.print(chalk.bold.cyan('📥 Importing Theme'));
      this.cli.print(chalk.gray('═══════════════════'));
      this.cli.print('');

      const fileContent = await fs.readFile(filePath, 'utf8');
      const themeData = JSON.parse(fileContent);

      const spinner = this.cli.createSpinner(`Importing theme from ${filePath}...`);
      spinner.start();

      const result = await this.cli.apiRequest('POST', '/api/themes/import', themeData);
      spinner.stop();

      if (result.success) {
        this.cli.printSuccess('Theme imported successfully!');
        this.cli.print(`  Theme ID: ${chalk.cyan(result.data.theme.id)}`);
        this.cli.print(`  Name: ${chalk.yellow(result.data.theme.name)}`);
      } else {
        this.cli.printError(`Failed to import theme: ${result.error}`);
      }

    } catch (error) {
      this.cli.printError(`Import failed: ${error.message}`);
    }
  }

  async showThemeStats() {
    const spinner = this.cli.createSpinner('Fetching theme statistics...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', '/api/themes/stats');
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch stats: ${result.error}`);
        return;
      }

      const stats = result.data;

      this.cli.print('');
      this.cli.print(chalk.bold.yellow('📈 Theme Statistics'));
      this.cli.print(chalk.gray('════════════════════'));
      this.cli.print('');

      this.cli.print(chalk.bold.white('Overview:'));
      this.cli.print(`  Total Themes: ${chalk.cyan(stats.total_themes || 0)}`);
      this.cli.print(`  Public Themes: ${chalk.green(stats.public_themes || 0)}`);
      this.cli.print(`  Private Themes: ${chalk.yellow(stats.private_themes || 0)}`);
      this.cli.print(`  Total Downloads: ${chalk.magenta(stats.total_downloads || 0)}`);
      this.cli.print('');

      if (stats.popular_themes && stats.popular_themes.length > 0) {
        this.cli.print(chalk.bold.white('Most Popular:'));
        stats.popular_themes.slice(0, 5).forEach((theme, index) => {
          this.cli.print(`  ${index + 1}. ${chalk.cyan(theme.name)} - ${chalk.yellow(theme.downloads)} downloads`);
        });
        this.cli.print('');
      }

      if (stats.recent_themes && stats.recent_themes.length > 0) {
        this.cli.print(chalk.bold.white('Recently Created:'));
        stats.recent_themes.slice(0, 5).forEach(theme => {
          const date = new Date(theme.createdAt).toLocaleDateString();
          this.cli.print(`  • ${chalk.cyan(theme.name)} - ${chalk.gray(date)}`);
        });
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch statistics: ${error.message}`);
    }
  }

  // Interactive helpers
  async interactiveSearch() {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Search query:',
        validate: input => input.length > 0 || 'Query is required'
      }
    ]);

    await this.searchThemes(query);
  }

  async interactiveCreate() {
    const { source } = await inquirer.prompt([
      {
        type: 'list',
        name: 'source',
        message: 'How would you like to create the theme?',
        choices: [
          { name: 'Interactive creation', value: 'interactive' },
          { name: 'Load from file', value: 'file' }
        ]
      }
    ]);

    if (source === 'file') {
      const { filePath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filePath',
          message: 'Path to theme file:',
          validate: input => input.length > 0 || 'File path is required'
        }
      ]);

      await this.createTheme(filePath);
    } else {
      await this.createTheme();
    }
  }

  async interactiveExport() {
    // First list themes to choose from
    const themesResult = await this.cli.apiRequest('GET', '/api/themes?limit=20');
    
    if (!themesResult.success || !themesResult.data?.themes?.length) {
      this.cli.printError('No themes available for export');
      return;
    }

    const choices = themesResult.data.themes.map(theme => ({
      name: `${theme.displayName} (${theme.name})`,
      value: theme.id
    }));

    const { themeId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'themeId',
        message: 'Select theme to export:',
        choices,
        pageSize: 10
      }
    ]);

    await this.exportTheme(themeId);
  }

  async interactiveImport() {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Path to theme file:',
        validate: input => input.length > 0 || 'File path is required'
      }
    ]);

    await this.importTheme(filePath);
  }
}