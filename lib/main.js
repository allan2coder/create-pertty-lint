#!/usr/bin/env node

// #!/usr/bin/env node：用于指明该脚本文件要使用node来执行

import chalk from 'chalk';
import gradient from 'gradient-string';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createSpinner } from 'nanospinner';
import {
  commonPackages,
  eslintConfig,
  eslintIgnore,
  prettierConfig,
  viteEslint,
} from './shared.js';
import { askForProjectType } from './utils.js';

// node进程当前工作目录
const projectDirectory = process.cwd();

const eslintFile = path.join(projectDirectory, '.eslintrc.json');
const prettierFile = path.join(projectDirectory, '.prettierrc.json');
const eslintIgnoreFile = path.join(projectDirectory, '.eslintignore');

async function run() {
  console.log(
    chalk.bold(gradient.morning('\n🚀 Welcome to Eslint & Prettier Setup!\n'))
  );
  let projectType, packageManager;

  try {
    const answers = await askForProjectType(); // { projectType: 'vue', packageManager: 'npm' }
    projectType = answers.projectType;
    packageManager = answers.packageManager;
  } catch (error) {
    console.log('error:', error);
    console.log(chalk.blue('\n👋 Goodbye!'));
    return;
  }
  const { packages, eslintOverrides } = await import(
    `./templates/${projectType}.js`
  );

  // path.join()方法是将多个参数合并成一个路径字符串，path.resolve()方法是以程序为根目录
  const viteJs = path.join(projectDirectory, 'vite.config.js');
  const viteTs = path.join(projectDirectory, 'vite.config.ts');
  const viteMap = {
    vue: viteJs,
    react: viteJs,
    'vue-ts': viteTs,
    'react-ts': viteTs,
  };
  const viteFile = viteMap[projectType];
  const hasViteFile = Boolean(fs.existsSync(viteFile));
  let viteConfig = null;

  // 是否含有vite配置
  if (hasViteFile) commonPackages.push('vite-plugin-eslint');

  const packageList = [...commonPackages, ...packages];
  const eslintConfigOverrides = [...eslintConfig.overrides, ...eslintOverrides];
  const eslint = { ...eslintConfig, overrides: eslintConfigOverrides };

  const commandMap = {
    npm: `npm install --save-dev ${packageList.join(' ')}`,
    yarn: `yarn add --dev ${packageList.join(' ')}`,
    pnpm: `pnpm install --save-dev ${packageList.join(' ')}`,
  };

  // 是否含有vite配置
  if (hasViteFile) {
    console.log('Found vite file1');
    // 利用 ast 插入 `vite-plugin-eslint`
    viteConfig = viteEslint(fs.readFileSync(viteFile, 'utf8'));
  }

  const installCommand = commandMap[packageManager];

  if (!installCommand) {
    console.log(chalk.red('\n✖ Sorry, we only support npm、yarn and pnpm!'));
    return;
  }

  const spinner = createSpinner('Installing packages...').start();
  // 创建shell，然后执行 npm install
  exec(`${commandMap[packageManager]}`, { cwd: projectDirectory }, (error) => {
    if (error) {
      spinner.error({
        text: chalk.bold.red('Failed to install packages!'),
        mark: '✖',
      });
      console.error(error);
      return;
    }

    // 写入文件
    fs.writeFileSync(eslintFile, JSON.stringify(eslint, null, 2)); // 文件路径，写入参数
    fs.writeFileSync(prettierFile, JSON.stringify(prettierConfig, null, 2));
    fs.writeFileSync(eslintIgnoreFile, eslintIgnore.join('\n'));

    // 是否含有vite配置
    if (hasViteFile) {
      console.log('Found vite file2');
      fs.writeFileSync(viteFile, viteConfig);
    }

    spinner.success({ text: chalk.bold.green('All done! 🎉'), mark: '✔' });
    console.log(
      chalk.bold.cyan('\n🔥 Reload your ide to activate the settings!')
    );
  });
}

run().catch((e) => {
  console.error(e);
});
