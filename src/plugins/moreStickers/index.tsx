/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./style.css";

import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";
import { Channel } from "discord-types/general";

import { PickerSidebar } from "./components/PickerCategoriesSidebar";
import { PickerContent } from "./components/PickerContent";
import { PickerHeader } from "./components/PickerHeader";
import { Wrapper } from "./components/wrapper";
import { getStickerPack, getStickerPackMetas } from "./stickers";
import { StickerPack, StickerPackMeta } from "./types";

const cl = classNameFactory("vc-more-stickers-");

export default definePlugin({
    name: "MoreStickers",
    description: "Adds sticker packs from other social media platforms. (e.g. LINE)",
    authors: [Devs.Arjix, Devs.Leko],

    start() {
    },

    stop() {
    },

    patches: [
        {
            find: "().stickerIcon,",
            replacement: [{
                match: /(children:\(0,\w\.jsx\)\()(\w{2})(,{innerClassName.{20,30}\.stickerButton)/,
                replace: (_, head, button, tail) => {
                    const isMoreStickers = "arguments[0]?.stickersType";
                    return `${head}${isMoreStickers}?$self.stickerButton:${button}${tail}`;
                }
            }, {
                match: /null==\(null===\(\w=\w\.stickers\)\|\|void 0.*?\.consolidateGifsStickersEmojis.*?(\w)\.push\((\(0,\w\.jsx\))\((\w+),{disabled:\w,type:(\w)},"sticker"\)\)/,
                replace: (m, _, jsx, compo, type) => {
                    const c = "arguments[0].type";
                    return `${m};${c}?.submit?.button&&${_}.push(${jsx}(${compo},{disabled:!${c}?.submit?.button,type:${type},stickersType:"stickers+"},"stickers+"))`;
                }
            }, {
                match: /(var \w,\w=)(\w\.useCallback\(\(function\(\)\{\(0,\w+\.\w+\)\(.*?\.STICKER,.*?);/,
                replace: (_, decl, cb) => {
                    const newCb = cb.replace(/(?<=function\(\)\{\(.*?\)\().+?\.STICKER/, "\"stickers+\"");
                    return `${decl}arguments[0]?.stickersType?${newCb}:${cb};`;
                }
            }, {
                match: /(\w)=((\w)===\w+\.\w+\.STICKER)/,
                replace: (_, isActive, isStickerTab, currentTab) => {
                    const c = "arguments[0].stickersType";
                    return `${isActive}=${c}?(${currentTab}===${c}):(${isStickerTab})`;
                }
            }]
        },
        {
            find: ".Messages.EXPRESSION_PICKER_GIF",
            replacement: {
                match: /role:"tablist",.{10,20}\.Messages\.EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL,children:(\[.*?\)\]}\)}\):null,)(.*?closePopout:\w.*?:null)/,
                replace: m => {
                    const stickerTabRegex = /(\w)\?(\(.+?\))\((\w{1,2}),.*?isActive:(\w)==.*?children:(.{1,10}Messages.EXPRESSION_PICKER_STICKER).*?:null/;
                    const res = m.replace(stickerTabRegex, (_m, canUseStickers, jsx, tabHeaderComp, currentTab, stickerText) => {
                        const isActive = `${currentTab}==="stickers+"`;
                        return (
                            `${_m},${canUseStickers}?` +
                            `${jsx}(${tabHeaderComp},{id:"stickers+-picker-tab","aria-controls":"more-stickers-picker-tab-panel","aria-selected":${isActive},isActive:${isActive},autoFocus:true,viewType:"stickers+",children:${jsx}("div",{children:${stickerText}+"+"})})` +
                            ":null"
                        );
                    });

                    return res.replace(/:null,((\w)===.*?\.STICKER&&\w\?(\(.*?\)).*?(\{.*?,onSelectSticker:.*?\})\):null)/, (_, _m, currentTab, jsx, props) => {
                        return `:null,${currentTab}==="stickers+"?${jsx}($self.moreStickersComponent,${props}):null,${_m}`;
                    });
                }
            }
        },
        {
            find: ".insertText=function",
            replacement: {
                match: /;\w\.insertText=function\(\w\){1===\w\.length&&"remove_text"=/,
                replace: ";$self.textEditor=arguments[0]$&"
            }
        }
    ],
    stickerButton({
        innerClassName,
        isActive,
        onClick
    }) {
        return (
            <button
                className={innerClassName}
                onClick={onClick}
                style={{ backgroundColor: "transparent" }}
            >
                {/* Icon taken from: https://github.com/Pitu/Magane/blob/0ebb09acf9901933ebebe19fbd473ec08cf917b3/src/Button.svelte#L29 */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 24 24"
                    className={cl("icon", { "icon-active": isActive })}
                >
                    <path d="M18.5 11c-4.136 0-7.5 3.364-7.5 7.5c0 .871.157 1.704.432 2.482l9.551-9.551A7.462 7.462 0 0 0 18.5 11z" />
                    <path d="M12 2C6.486 2 2 6.486 2 12c0 4.583 3.158 8.585 7.563 9.69A9.431 9.431 0 0 1 9 18.5C9 13.262 13.262 9 18.5 9c1.12 0 2.191.205 3.19.563C20.585 5.158 16.583 2 12 2z" />
                </svg>
            </button>
        );
    },
    moreStickersComponent({
        channel,
        closePopout
    }: {
        channel: Channel,
        closePopout: () => void;
    }) {
        const [query, setQuery] = React.useState<string | undefined>();
        const [stickerPackMetas, setStickerPackMetas] = React.useState<StickerPackMeta[]>([]);
        const [stickerPacks, setStickerPacks] = React.useState<StickerPack[]>([]);
        const [counter, setCounter] = React.useState(0);
        const [selectedStickerPackId, setSelectedStickerPackId] = React.useState<string | null>(null);

        const getMetasSignature = (m: StickerPackMeta[]) => m.map(x => x.id).sort().join(",");

        React.useEffect(() => {
            (async () => {
                console.log("Updating sticker packs...", counter);
                setCounter(counter + 1);

                const sps = (await Promise.all(
                    stickerPackMetas.map(meta => getStickerPack(meta.id))
                ))
                    .filter((x): x is Exclude<typeof x, null> => x !== null);
                setStickerPacks(sps);
            })();
        }, [stickerPackMetas]);

        React.useEffect(() => {
            (async () => {
                const metas = await getStickerPackMetas();
                if (getMetasSignature(metas) !== getMetasSignature(stickerPackMetas)) {
                    setStickerPackMetas(metas);
                }
            })();
        }, []);

        return (
            <Wrapper>
                <svg width="1" height="1" viewBox="0 0 1 1" fill="none" xmlns="http://www.w3.org/2000/svg" id="vc-more-stickers-inspectedIndicatorMask">
                    <path d="M0 0.26087C0 0.137894 0 0.0764069 0.0382035 0.0382035C0.0764069 0 0.137894 0 0.26087 0H0.73913C0.862106 0 0.923593 0 0.961797 0.0382035C1 0.0764069 1 0.137894 1 0.26087V0.73913C1 0.862106 1 0.923593 0.961797 0.961797C0.923593 1 0.862106 1 0.73913 1H0.26087C0.137894 1 0.0764069 1 0.0382035 0.961797C0 0.923593 0 0.862106 0 0.73913V0.26087Z" fill="white" />
                </svg>

                <PickerHeader onQueryChange={setQuery} />
                <PickerContent
                    stickerPacks={stickerPacks}
                    selectedStickerPackId={selectedStickerPackId}
                    setSelectedStickerPackId={setSelectedStickerPackId}
                    channelId={channel.id}
                    closePopout={closePopout}
                    query={query}
                />
                <PickerSidebar
                    packMetas={
                        stickerPackMetas.map(meta => ({
                            id: meta.id,
                            name: meta.title,
                            iconUrl: meta.logo.image
                        }))
                    }
                    onPackSelect={pack => {
                        setSelectedStickerPackId(pack.id);
                    }}
                ></PickerSidebar>
            </Wrapper>
        );
    }
});