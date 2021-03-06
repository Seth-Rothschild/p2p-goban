import {parseVertex, parseCompressedVertices} from '@sabaki/sgf'
import Board from '@sabaki/go-board'
import identities from './identities.json'

let boardCache = {}

export function vertexEquals([x1, y1], [x2, y2]) {
    return x1 === x2 && y1 === y2
}

export function boardFromTreePosition(tree, position) {
    let node = tree.get(position)
    if (node == null) return Board.fromDimensions(19, 19)

    if (node.parentId == null) {
        let size = (node.data.SZ || ['19'])[0]
        let width, height

        if (size.includes(':')) [width, height] = size.split(':').map(x => +x)
        else width = height = +size

        return Board.fromDimensions(width, height)
    }

    let board = node.parentId in boardCache
        ? boardCache[node.parentId]
        : boardFromTreePosition(tree, node.parentId)

    let sign, vertex

    if (node.data.B != null) {
        vertex = parseVertex(node.data.B[0])
        sign = 1
    } else if (node.data.W != null) {
        vertex = parseVertex(node.data.W[0])
        sign = -1
    }

    if (sign != null && vertex != null && board.has(vertex)) {
        board = board.makeMove(sign, vertex)
    }

    let propData = {AW: -1, AE: 0, AB: 1}

    for (let prop in propData) {
        for (let value of node.data[prop] || []) {
            for (let vertex of parseCompressedVertices(value)) {
                if (!board.has(vertex)) continue
                board.set(vertex, propData[prop])
            }
        }
    }

    boardCache[position] = board
    return board
}

export function nodeMerger(node, data) {
    if (
        node.data.B != null && data.B != null && node.data.B[0] === data.B[0]
        || node.data.W != null && data.W != null && node.data.W[0] === data.W[0]
    ) {
        return Object.assign({}, node.data, data)
    }

    return null
}

export function getMatrixDict(tree) {
    let matrix = [...Array(tree.getHeight() + 1)].map(_ => [])
    let dict = {}

    let inner = (node, matrix, dict, xshift, yshift) => {
        let sequence = [...tree.getSequence(node.id)]
        let hasCollisions = true

        while (hasCollisions) {
            hasCollisions = false

            for (let y = 0; y <= sequence.length; y++) {
                if (xshift >= matrix[yshift + y].length - (y === sequence.length)) continue

                hasCollisions = true
                xshift++
                break
            }
        }

        for (let y = 0; y < sequence.length; y++) {
            matrix[yshift + y][xshift] = sequence[y].id
            dict[sequence[y].id] = [xshift, yshift + y]
        }

        let lastSequenceNode = sequence.slice(-1)[0]

        for (let k = 0; k < lastSequenceNode.children.length; k++) {
            let child = lastSequenceNode.children[k]
            inner(child, matrix, dict, xshift + k, yshift + sequence.length)
        }
    }

    inner(tree.root, matrix, dict, 0, 0)
    matrix.pop()

    return [matrix, dict]
}

export function getMatrixWidth(y, matrix) {
    let keys = [...Array(10)]
        .map((_, i) => i + y - 4)
        .filter(i => i >= 0 && i < matrix.length)

    let padding = Math.min(...keys.map(i => {
        for (let j = 0; j < matrix[i].length; j++)
            if (matrix[i][j] != null) return j
        return 0
    }))

    let width = Math.max(...keys.map(i => matrix[i].length)) - padding

    return [width, padding]
}

export function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1)
}

export function getRgbFromHsv(h, s, v) {
    let i = Math.floor(h * 6)
    let f = h * 6 - i
    let p = v * (1 - s)
    let q = v * (1 - f * s)
    let t = v * (1 - (1 - f) * s)
    let rgb = [
        [v, t, p],
        [q, v, p],
        [p, v, t],
        [p, q, v],
        [t, p, v],
        [v, p, q]
    ][i % 6]

    return rgb.map(x => Math.round(x * 255))
}

export function getIdentity(input) {
    let hash = [...Array(input.length)].map((_, i) => input.charCodeAt(i))
    let mod1 = x => x - Math.floor(x)
    let getIndexFromHash = (m, hash) => (hash.reduce((acc, x) => (acc * 33) ^ x, 5381) >>> 0) % m
    let getItemFromHash = (arr, hash) => arr[getIndexFromHash(arr.length, hash)]
    let getHsvFromHash = hash => [
        mod1(79 / 997 * getIndexFromHash(997, hash)),
        (getIndexFromHash(4, hash) + 1) / 4, 1
    ]

    let adjective = getItemFromHash(identities.adjectives, hash)
    let noun = getItemFromHash(identities.nouns, hash)

    return {
        color: getRgbFromHsv(...getHsvFromHash(hash)),
        name: capitalize(adjective) + ' ' + capitalize(noun)
    }
}
