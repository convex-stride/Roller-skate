# City accuracy and source limitations

Version 0.9 is a connected skating interpretation of Gdańsk and Riyadh. It is not a surveyed street map, photogrammetry reconstruction, or faithful geographic replica. The cities remain in fictional adjacent regions to preserve the requested continuous connection. Their street generators now differ in street width, block size, building density, height, planting and public-space design, rather than sharing a single layout with different facade colours.

## What is based on real places

| City | Architectural reference | Features represented |
| --- | --- | --- |
| Gdańsk | Żuraw | Brick harbour-gate towers and a projecting dark timber crane structure |
| Gdańsk | Main Town Hall | Gothic brick massing, a clock tower, and a copper-colored spire |
| Gdańsk | Green Gate | Long Renaissance façade and four open ground-floor passages |
| Gdańsk | Neptune’s Fountain | Stone basin, bronze figure and three-pronged trident; simplified sculptural anatomy |
| Riyadh | Kingdom Centre | Tapered tower with a large curved upper opening and skybridge |
| Riyadh | Al Faisaliyah | Triangular profile and golden globe near the upper section |
| Riyadh | Masmak | Earth-colored fortress walls and four round corner towers |
| Riyadh | Deera Clock Tower | Pale stepped tower with four clock faces beside the heritage starting square |
| Riyadh | Souq Al Zal | Market-inspired plaster shop arcades and patterned carpet displays; fictional storefront layout |

The surrounding streets use recognizable local architectural character: narrow gabled merchant-house fronts and harbour materials in Gdańsk; modern glazing, broad asphalt lanes, parking, palms, and sandstone heritage forms in Riyadh. These are authored interpretations rather than copies of specific façade surveys. Heights and distances are compressed for gameplay. Landmarks that are widely separated in reality appear much closer here. Their in-game coordinates in `src/city-profile.ts` are fictional, not latitude/longitude conversions.

## What is not verified

Street alignments, road widths, exact building dimensions, neighborhood adjacencies, street signs, and full landmark details are not guaranteed accurate. Outer districts still contain repeated modular geometry. Parked cars are static scene objects; they do not constitute a traffic simulation. Interiors are not reconstructed. Green Gate has traversable passages, while other landmark masses are exterior destinations.

## Map-data blocker

On 2026-10-25, requests to the public OpenStreetMap map API and Wikipedia landmark reference pages returned HTTP 403 proxy denials, including access retries. No OpenStreetMap data was downloaded or incorporated. These failures must not be described as successful map research or used to claim street-level fidelity.

A geographically accurate next version needs validated map/source data for selected real districts, including road and building footprints and verified landmark dimensions. Public API access would require `api.openstreetmap.org`; reference access would require the relevant documentation hosts. A supplied licensed map export is another workable input. Any imported data must carry its required attribution/license and be checked against the playable world, collision, navigation, and area requirements.
