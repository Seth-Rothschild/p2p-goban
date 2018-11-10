import {h, Component} from 'preact'
import {Goban} from '@sabaki/shudan'
import Board from '../crdt-board.js'

export default class App extends Component {
    constructor(props) {
        super(props)

        this.state = {
            sign: 1,
            board: new Board()
        }
    }

    handleVertexClick(evt, vertex) {
        evt.preventDefault()

        this.setState(({board, sign}) => {
            board.set(vertex, board.get(vertex) !== 0 ? 0 : sign)
            return {board}
        })
    }

    render() {
        let {board} = this.state
        let signMap = board.render(19, 19)
        let markerMap = signMap.map(row => row.map(_ => null))
        let currentVertex = board.getCurrentVertex()

        if (currentVertex != null) {
            let [x, y] = currentVertex
            markerMap[y][x] = {type: 'point'}
        }

        return h(Goban, {
            showCoordinates: true,
            fuzzyStonePlacement: true,
            animateStonePlacement: true,

            signMap,
            markerMap,

            onVertexClick: this.handleVertexClick.bind(this)
        })
    }
}