(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
        getElementsByXpath,
        getClosestAncestor,
        insertAfter,
        createElementFromHTML,
        xPathResultToArray,
    } = window.stash;

    function processMatchRemotePerformer(node, matchNode) {
        if (!matchNode) matchNode = getClosestAncestor(node, '.search-item');
        const resultLink = matchNode.querySelector('.scene-details .optional-field .optional-field-content a');
        const stashId = resultLink.href.split('/').pop();
        const resultUrl = new URL(resultLink.href);
        const scene = stash.remoteScenes[stashId];
        const performerNode = node.querySelector('b.ml-2');
        const performerName = performerNode.innerText;
        const performer = scene.performers.find(performer => performer.name === performerName);
        const performerUrl = resultUrl.origin + '/performers/' + performer.remote_site_id;
        performerNode.innerHTML = `<a href=${performerUrl} target="_blank">${performerName}</a>`;
    }

    function processMatchRemoteStudio(node, matchNode) {
        if (!matchNode) matchNode = getClosestAncestor(node, '.search-item');
        const resultLink = matchNode.querySelector('.scene-details .optional-field .optional-field-content a');
        const stashId = resultLink.href.split('/').pop();
        const resultUrl = new URL(resultLink.href);
        const scene = stash.remoteScenes[stashId];
        const subNode = node.querySelector('b.ml-2');
        const studioName = subNode.innerText;
        const studioUrl = resultUrl.origin + '/studios/' + scene.studio.remote_site_id;
        subNode.innerHTML = `<a href=${studioUrl} target="_blank">${studioName}</a>`;
    }

    async function getPerformerByName(name) {
        const reqData = {
            "operationName": "FindPerformers",
            "variables": {
                "performer_filter": {
                  "name": {
                    "value": name,
                    "modifier": "EQUALS"
                  }
                }
              },
            "query": `query FindPerformers($filter: FindFilterType, $performer_filter: PerformerFilterType) {
                findPerformers(filter: $filter, performer_filter: $performer_filter) {
                  performers {
                    id
                  }
                }
              }`
        };
        const result = await stash.callGQL(reqData);
        if (result?.data?.findPerformers?.performers?.length) {
            return result.data.findPerformers.performers[0];
        }
        return null;
    }

    async function getStudioByName(name) {
        const reqData = {
            "operationName": "FindPerformers",
            "variables": {
                "studio_filter": {
                  "name": {
                    "value": name,
                    "modifier": "EQUALS"
                  }
                }
              },
            "query": `query FindStudios($filter: FindFilterType, $studio_filter: StudioFilterType) {
                findStudios(filter: $filter, studio_filter: $studio_filter) {
                  studios {
                    id
                  }
                }
              }`
        };
        const result = await stash.callGQL(reqData);
        if (result?.data?.findStudios?.studios?.length) {
            return result.data.findStudios.studios[0];
        }
        return null;
    }

    async function processMatchLocal(node, matchNode) {
        if (!matchNode) matchNode = getClosestAncestor(node, '.search-item');
        const resultLink = matchNode.querySelector('.scene-details .optional-field .optional-field-content a');
        const stashId = resultLink.href.split('/').pop();
        const resultUrl = new URL(resultLink.href);
        const scene = stash.remoteScenes[stashId];
        const subNode = node.querySelector('b');
        const remoteNode = node.parentElement.querySelector('.entity-name b.ml-2');
        if (remoteNode.parentElement.innerText.startsWith('Performer:')) {
            const remotePerformerName = remoteNode.innerText;
            let performer = scene.performers.find(performer => performer.name === remotePerformerName);
            let performerUrl;
            if (performer.stored_id) {
                performerUrl = window.location.origin + '/performers/' + performer.stored_id;
            }
            else {
                performer = await getPerformerByName(subNode.innerText);
                performerUrl = window.location.origin + '/performers/' + performer.id;
            }
            subNode.innerHTML = `<a href=${performerUrl} target="_blank">${subNode.innerText}</a>`;
        }
        else if (remoteNode.parentElement.innerText.startsWith('Studio:')) {
            let studioUrl;
            if (scene.studio.stored_id) {
                studioUrl = window.location.origin + '/studios/' + scene.studio.stored_id;
            }
            else {
                studio = await getStudioByName(subNode.innerText);
                studioUrl = window.location.origin + '/studios/' + studio.id;
            }
            subNode.innerHTML = `<a href=${studioUrl} target="_blank">${subNode.innerText}</a>`;
        }
    }

    function processMatchResult(matchNode) {
        const remotePerformerNodes = getElementsByXpath('.//div[@class="entity-name" and text()="Performer"]', matchNode);
        for (const performerNode of xPathResultToArray(remotePerformerNodes)) {
            processMatchRemotePerformer(performerNode, matchNode);
        }
        const localPerformerNodes = getElementsByXpath('.//div[@class="entity-name" and text()="Performer"]/following-sibling::span[@class="ml-auto"]', matchNode);
        for (const performerNode of xPathResultToArray(localPerformerNodes)) {
            processMatchLocal(performerNode, matchNode);
        }
        const remoteStudioNode = getElementByXpath('.//div[@class="entity-name" and text()="Studio"]', matchNode);
        if (remoteStudioNode) {
            processMatchRemoteStudio(remoteStudioNode, matchNode);
        }
        const localStudioNode = getElementByXpath('.//div[@class="entity-name" and text()="Studio"]/following-sibling::span[@class="ml-auto"]', matchNode);
        if (localStudioNode) {
            processMatchLocal(localStudioNode, matchNode);
        }
    }

    stash.addEventListener('tagger:searchitem', function (evt) {
        const searchItem = evt.detail;
        const sceneLink = searchItem.querySelector('a.scene-link');
        sceneLink.addEventListener("click", (event) => {
            event.preventDefault();
            window.open(sceneLink.href, '_blank');
        });
    });

    stash.addEventListener('tagger:mutation:add:remoteperformer', evt => processMatchRemotePerformer(evt.detail.node));
    stash.addEventListener('tagger:mutation:add:remotestudio', evt => processMatchRemoteStudio(evt.detail.node));
    stash.addEventListener('tagger:mutation:add:local', evt => processMatchLocal(evt.detail.node));
    stash.addEventListener('tagger:mutation:add:container', evt => processMatchResult(evt.detail.node));
    stash.addEventListener('tagger:mutation:add:subcontainer', evt => processMatchResult(getClosestAncestor(evt.detail.node, '.search-item')));
})();