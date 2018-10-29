# My JavaScript Boilerplate

Whenever I start a JavaScript-based project, I see myself constantly building the same initial setup. I have decided to build a repository where I keep my initial configuration so it is easier to use it.

If you have any advice/tips on this setup, do not hesitate to share! I am looking forward to improving it!

## What is being used

- [.editorconfig](.editorconfig)

> [Editor Config](https://editorconfig.org) helps developers define and maintain consistent coding styles between different editors and IDEs. The EditorConfig project consists of a file format for defining coding styles and a collection of text editor plugins that enable editors to read the file format and adhere to defined styles.

_From their own website_

Basically, if you ever opened a project and your tab has a different number of spaces compared to the project, you'll have to go to the settings and change that. Editor Config allows you to override these settings and adhere to the project guidelines. Remember to use this in conjunction with [ESLint](https://eslint.org). Otherwise, you may lint to 2 spaces while having Editor Config overriding to 4 spaces.


- [.eslintrc](.eslintrc)

> Code linting is a type of static analysis that is frequently used to find problematic patterns or code that doesn’t adhere to certain style guidelines

_From their own website_

I have chosen [Airbnb style guide](https://github.com/airbnb/javascript) and override the indent to 4 spaces. I have no particular reason to have chosen this one. I tried it, liked it and stuck to it. I use 4 spaces because I can see better the encapsulation and prevents me to go too deep into the nest. My rule of thumb is to stick to any style guide you like and be consistent.


- [.gitattributes](.gitattributes)

> Using [attributes](https://git-scm.com/book/en/v2/Customizing-Git-Git-Attributes), you can do things like specifying separate merge strategies for individual files or directories in your project, tell Git how to diff non-text files, or have Git filter content before you check it into or out of Git.

_From their own website_

I use it to be clear what files are binary and which are text. I also use it to be consistent with the end of lines. One of the reasons I particularly enjoy it is that I can create a new file format and decide how I want Git to interpret it. For instance, imagine you create a new image file format and then Git send to remote by replacing characters to [LF](https://en.wikipedia.org/wiki/Newline), in this case, your file would be corrupted. 


- [.gitignore](.gitignore)

> A [gitignore](https://git-scm.com/docs/gitignore) file specifies intentionally untracked files that Git should ignore. Files already tracked by Git are not affected.

_From their own website_

I use to ignore local files such as [.DS_STORE](https://en.wikipedia.org/wiki/.DS_Store). I don't want to stage or even commit those files. This can be a burden when a lot of local directories are created in runtime. Luckily, [gitignore.io](https://www.gitignore.io) can speed up this process. I have been using it for a while and I recommend it.


- [.travis.yml](.travis.yml)

> The simplest way to test and deploy your projects.

_From their own website_

[Travis CI](https://travis-ci.com) allows to test the code on pull requests and even pushed branches. You can even use it to add [badges](https://shields.io/) to the repository and to deploy to multiple online services (like [Heroku](https://heroku.com)). Most of the times I just use it to lint the project.


- [LICENSE](LICENSE)

Most of the times I use the [MIT](https://en.wikipedia.org/wiki/MIT_License) license. It is very permissive and gives a lot of freedom to whom wants to use the project.


- [package.json](package.json)

This file allows me to manage my dependencies, provide a quick preview of the project and add multiple scripts such as linting. I also like to have a [postinstall](https://docs.npmjs.com/misc/scripts) script.

  - [postinstall.sh](postinstall.sh)

This file links git hooks to the `.git` directory.


- [git-hooks](git-hooks/)

> Like many other Version Control Systems, Git has a way to fire off custom scripts when certain important actions occur. There are two groups of these hooks: client-side and server-side. Client-side hooks are triggered by operations such as committing and merging, while server-side hooks run on network operations such as receiving pushed commits. You can use these hooks for all sorts of reasons.

_From their own website_

[Git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) allows to run [pre-commit.sh](git-hooks/pre-commit.sh) before making a commit. The _only_ way for the files to be committed is to pass this check. This helps to ensure that any commit in the repository follows the style guide.
