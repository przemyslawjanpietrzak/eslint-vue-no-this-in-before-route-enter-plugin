/**
 * @fileoverview detect if there is a potential typo in your component property
 * @author IWANABETHATGUY
 */
'use strict'

const utils = require('../utils')
const vueComponentOptions = require('../utils/vue-component-options.json')
// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow a potential typo in your component property',
      categories: undefined,
      recommended: false,
      url:
        'https://eslint.vuejs.org/rules/no-potential-component-option-typo.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          presets: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['all', 'vue', 'vue-router', 'nuxt']
            },
            uniqueItems: true,
            minItems: 0
          },
          custom: {
            type: 'array',
            minItems: 0,
            items: { type: 'string' },
            uniqueItems: true
          },
          threshold: {
            type: 'number',
            minimum: 1
          }
        }
      }
    ]
  },

  create(context) {
    const option = context.options[0] || {}
    const custom = option.custom || []
    const presets = option.presets || ['vue']
    const threshold = option.threshold || 1
    let candidateOptions
    if (presets.includes('all')) {
      candidateOptions = Object.keys(vueComponentOptions).reduce((pre, cur) => {
        return [...pre, ...vueComponentOptions[cur]]
      }, [])
    } else {
      candidateOptions = presets.reduce((pre, cur) => {
        return [...pre, ...vueComponentOptions[cur]]
      }, [])
    }
    const candidateOptionSet = new Set([...candidateOptions, ...custom])
    const candidateOptionList = [...candidateOptionSet]
    if (!candidateOptionList.length) {
      return {}
    }
    return utils.executeOnVue(context, (obj) => {
      const componentInstanceOptions = obj.properties.filter(
        (p) => p.type === 'Property' && p.key.type === 'Identifier'
      )
      if (!componentInstanceOptions.length) {
        return {}
      }
      componentInstanceOptions.forEach((option) => {
        const id = option.key
        const name = id.name
        if (candidateOptionSet.has(name)) {
          return
        }
        const potentialTypoList = candidateOptionList
          .map((o) => ({ option: o, distance: utils.editDistance(o, name) }))
          .filter(
            ({ distance, option }) => distance <= threshold && distance > 0
          )
          .sort((a, b) => a.distance - b.distance)
        if (potentialTypoList.length) {
          context.report({
            node: id,
            loc: id.loc,
            message: `'{{name}}' may be a typo, which is similar to option [{{option}}].`,
            data: {
              name,
              option: potentialTypoList.map(({ option }) => option).join(',')
            },
            suggest: potentialTypoList.map(({ option }) => ({
              desc: `Replace property '${name}' to '${option}'`,
              fix(fixer) {
                return fixer.replaceText(id, option)
              }
            }))
          })
        }
      })
    })
  }
}