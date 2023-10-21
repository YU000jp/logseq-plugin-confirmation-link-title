import { includeTitle } from './lib'


//Credit
//https://github.com/0x7b1/logseq-plugin-automatic-url-title


export const DEFAULT_REGEX = {
    wrappedInApostrophe: /(`+)(.*?)\1(?=[^`]*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,}))[^\`]*?\1/gis,
    wrappedInHTML: /@@html:\s*(.*?)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*(.*?)\s*@@/gis,
    wrappedInCommand: /(\{\{([a-zA-Z]+)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*\}\})/gis,
    wrappedInHiccup: /\[:\s*(.*?)\s*?(https?:\/\/(?:www\.|(?!www))\w[\w-]+\.\S{2,}|www\.\w[\w-]+\.\S{2,}|https?:\/\/(?:www\.|(?!www))\w+\.\S{2,}|www\.\w+\.\S{2,})\s*(.*?)\s*\]/gis,
    htmlTitleTag: /<title(\s[^>]+)*>([^<]*)<\/title>/,
    line: /(https?:\/\/(?:www\.|\b)(\w[\w-]+\w\.[^\s　]{2,}|www\.\w[\w-]+\w\.[^\s　]{2,}|\w+\.[^\s　]{2,}|www\.\w+\.[^\s　]{2,}))(?!\))/gi,
    imageExtension: /\.(gif|jpe?g|tiff?|png|webp|bmp|tga|psd|ai)$/i,
    pdfExtension: /\.(pdf)$/i,
}
export const FORMAT_SETTINGS = {
    markdown: {
        formatBeginning: '](',
        applyFormat: (title, url) => `[${title}](${url})`,
    },
    org: {
        formatBeginning: '][',
        applyFormat: (title, url) => `[[${url}][${title}]]`,
    },
}
export const getTitleFromURL = async (url: string): Promise<string> => {
    try {
        const res = await fetch(url) as Response
        if (!res.ok) return ''
        const buffer = await res.arrayBuffer() as ArrayBuffer
        const encoding = getEncodingFromHTML(buffer)
        const decodedHtml = new TextDecoder(encoding).decode(buffer) //文字化け対策
        let matches = decodedHtml.match(DEFAULT_REGEX.htmlTitleTag)
        if (matches !== null && matches.length > 1 && matches[2] !== null) return matches[2].trim()
    } catch (e) {
        console.error(e)
    }
    return ''
}
const getEncodingFromHTML = (buffer: ArrayBuffer): string => {
    const uint8Array = new Uint8Array(buffer)
    const dom = new DOMParser().parseFromString(new TextDecoder().decode(uint8Array), 'text/html')
    return (
        dom.querySelector('meta[charset]')?.getAttribute?.('charset') ??
        (dom.querySelector('meta[http-equiv="content-type"]') as HTMLMetaElement)?.content?.match?.(/charset=([^;]+)/)?.[1] ??
        'UTF-8'
    )
}

export const convertUrlToMarkdownLink = (title: string, url, text, applyFormat) => {
    if (!title) return
    return text.replace(url, applyFormat(includeTitle(title), url))
}

export const isImage = (url: string) => (new RegExp(DEFAULT_REGEX.imageExtension)).test(url)
export const isPDF = (url: string) => (new RegExp(DEFAULT_REGEX.pdfExtension)).test(url)
export const isAlreadyFormatted = (text: string, urlIndex: number, formatBeginning: string) => text.slice(urlIndex - 2, urlIndex) === formatBeginning
export const isWrappedIn = (text, url) => {
    // "@@html: "URLを含む何らかの文字"@@"にマッチする
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/1
    // `URLを含む何らかの文字`にマッチする ``も対応
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/3
    // [: "URL"]のような形式にマッチする
    //https://github.com/YU000jp/logseq-plugin-some-menu-extender/issues/8
    const wrappedLinks = text.match(DEFAULT_REGEX.wrappedInCommand) || text.match(DEFAULT_REGEX.wrappedInHTML) || text.match(DEFAULT_REGEX.wrappedInApostrophe) || text.match(DEFAULT_REGEX.wrappedInHiccup)
    if (!wrappedLinks) return false
    return wrappedLinks.some(command => command.includes(url))
}
export const getFormatSettings = (format: string) => FORMAT_SETTINGS[format]
