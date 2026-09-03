# Grants at LMEC

This repository handles the deployment for maps and apps developed and/or hosted by LMEC for grant programs, including Small Grants and Grants in Aid.

# Build and deploy

Contents of this repository continuously deploy via Netlify to https://grants.leventhal.center. Currently, that page redirects to https://www.leventhalmap.org/research/digital-publication-small-grants/, and only its directories have projects.

The `_redirects` file at the root of this directory is doing the heavy lifting for the site architecture. When you are ready to add a new project, just follow the convention of URLs in the `_redirects` file. This process is explained below but it is very easy.

# What this deploy chain does not do

Currently, the build/deploy chain isn't directly wired up to source code for the projects it displays. For instance, there is a separate repository for the [Gardens of Egleston](https://github.com/bplmaps/gardens-of-egleston) small grant. If a maintainer needs to update that project, they must 1) clone that repo, 2) `npm install` and make their necessary changes, 3) `npm run build` to generate the static site, and 4) hand-copy the built site into this `grants` repository.

Sorry this is clunky! We should make it better, e.g. have a manifest of URLs and some web hooks or github actions on the source project repos that build their sites and commit their changes here. I did it this way because I thought it was better than having a separate netlify project for each deployment, and I did not like having to hand-copy stuff into `geoservices`. Although at the end of the day I guess this is not much different.

# How to add new projects

Let's imagine Norman has a Grant in Aid about mapping Boston, entitled "Mapping Boston," and we made a Leaflet map for him. Here are the minimum steps for getting Norman's project deployed:

First, obviously, make Norman's project. It should probably be in a separate repository under the `bplmaps` GitHub. Let's say his project source is at `https://github.com/bplmaps/mapping-boston`.

Next, we need to build Norman's project as a static site. If we built Norman's project in vanilla HTML/JS/CSS with some Leaflet plugins, just get all the assets together. If the project was built with a framework, like Svelte, do `npm run build` or equivalent (I think it will usually be `npm run build`) to build the Mapping Boston project as a static site.

Now, create a new directory in this repository for `mapping-boston` and paste the full static site from source repository to the new `mapping-boston` folder in this repo.

Finally, update the `_redirects` file, adding a new line above the 301 redirect and below the lowest 200 redirect. In this case, it should look like:

```
/grants/mapping-boston/* /grants/mapping-boston/index.html 200
```
