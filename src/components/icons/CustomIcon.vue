<script>
import { h } from 'vue'

export default {
  props: {
    size: {
      type: [Number, String],
      default: 20,
    },
    color: {
      type: String,
      default: 'currentColor',
    },
    viewBox: {
      type: String,
      default: '0 0 16 16',
    },
    paths: {
      type: Array,
      required: true,
      // каждый элемент — объект с атрибутами для <path>, например { d: '...', fill: 'currentColor' }
    },
  },
  setup(props) {
    return () =>
      h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: props.viewBox,
          fill: props.color,
          width: props.size,
          height: props.size,
          'aria-hidden': 'true',
          focusable: 'false',
        },
        props.paths.map((pathAttrs) => h('path', pathAttrs))
      )
  },
}
</script>