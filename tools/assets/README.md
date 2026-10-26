# Rider source data

`makehuman-base.obj` is the original MakeHuman core base mesh, retrieved from:

https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj

The asset's own header explicitly releases it as CC0 in September 2020. The project's `LICENSE.md` distinguishes CC0 core graphical assets from AGPL application code. No MakeHuman application code is used here. Full CC0 terms and author credits are retained in `public/THIRD_PARTY_NOTICES.txt` and the release builds.

Source SHA-256: `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c`.

Run `npm run build:rider` to generate `src/assets/rider-base.glb`. The Three.js build tool selects the clothing proxy plus exposed head and hand surfaces, converts units to a 1.78 m anatomical body, builds joints from the source joint markers, generates skin weights, and exports an indexed skinned mesh. Eyes, skates, fair skin tone, material colors, and skating IK are added at runtime by `src/rider.ts`. The fitted hijab and overlaid paisley bandana are original procedural cloth geometry/textures in `src/headwear.ts`.

The generated model has 9,546 vertices and 18,840 triangles. The OBJ remains build input only; it is not included in the playable download. No texture or logo from the earlier evaluated Cesium sample is used in the released rider.
