import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { Field, FieldLabel, FieldHint, FieldError, FieldInput, FieldAction } from '@strapi/design-system/Field';
import { Typography } from '@strapi/design-system/Typography';
import MediaLib from '../MediaLib/index.js';
import Editor from '../Editor';
import { useIntl } from 'react-intl';
import { getSettings } from "../../../../utils/api";
import defaultSettings from "../../../../utils/defaults";
import { useQuery } from 'react-query';
import Earth from "@strapi/icons/Earth"

// Editor
import { useEditor } from '@tiptap/react'
import { Extension, mergeAttributes, wrappingInputRule } from '@tiptap/core'
import UnderlineExtension from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import TextAlignExtension from '@tiptap/extension-text-align'
import TableExtension from '@tiptap/extension-table'
import TableRowExtension from '@tiptap/extension-table-row'
import TableCellExtension from '@tiptap/extension-table-cell'
import TableHeaderExtension from '@tiptap/extension-table-header'
import TextStyleExtension from '@tiptap/extension-text-style'
import CharacterCountExtension from '@tiptap/extension-character-count'
import YouTubeExtension from '@tiptap/extension-youtube'
import CodeExtension from '@tiptap/extension-code'
import BoldExtension from '@tiptap/extension-bold'
import ItalicExtension from '@tiptap/extension-italic'
import StrikeExtension, { Strike } from '@tiptap/extension-strike'
import OrderedListExtension from "@tiptap/extension-ordered-list"
import BulletListExtension from '@tiptap/extension-bullet-list'
import ListItemExtension from '@tiptap/extension-list-item'
import GapcursorExtension from '@tiptap/extension-gapcursor'
import History from '@tiptap/extension-history'
import BlockquoteExtension from '@tiptap/extension-blockquote'
import CodeBlockExtension from '@tiptap/extension-code-block'
import DocumentExtension from '@tiptap/extension-document'
import HardBreakExtension from '@tiptap/extension-hard-break'
import HeadingExtension from '@tiptap/extension-heading'
import HorizontalRuleExtension from '@tiptap/extension-horizontal-rule'
import ParagraphExtension from '@tiptap/extension-paragraph'
import TextExtension from '@tiptap/extension-text'
import { Color as ColorExtension } from '@tiptap/extension-color'
import HighlightExtension from '@tiptap/extension-highlight'
import { mergeDeep } from "../../utils/merge";
import { TOCExtension } from '../../features/toc/tableOfContents.js';
import BubbleMenu from '@tiptap/extension-bubble-menu'



const Wysiwyg = (opts) => {
  const { name, onChange, value, intlLabel, labelAction, disabled, error, description, required } = opts
  const { data: savedSettings, isLoading } = useQuery('settings', getSettings)
  const settings = mergeDeep(defaultSettings, savedSettings)
  if (isLoading) return null


  return (
    <WysiwygContent
      name={name}
      onChange={onChange}
      value={value}
      intlLabel={intlLabel}
      labelAction={labelAction}
      disabled={disabled}
      error={error}
      description={description}
      required={required}
      settings={settings}
    />
  )
}

const CSSColumnsExtension = Extension.create({
  name: 'cssColumns',
  addOptions() {
    return {
      types: [],
      columnTypes: [2, 3],
      defaultColumnType: 'two',
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          cssColumns: {
            default: null,
            renderHTML: attributes => {
              if (attributes.cssColumns === null) return
              return {
                style: `column-count: ${attributes.cssColumns}`,
              }
            },
            parseHTML: element => element.style.columnCount || null,
          },
        },
      }
    ]
  },
  addCommands() {
    return {
      toggleColumns: (columnType) => ({ commands, editor }) => {
        if (!editor.isActive({ 'cssColumns': columnType })) return this.options.types.every((type) => commands.updateAttributes(type, { cssColumns: columnType }))
        return this.options.types.every((type) => commands.resetAttributes(type, 'cssColumns'))
      },
      unsetColumns: (columnType) => ({ commands }) => {
        return this.options.types.every((type) => commands.resetAttributes(type, 'cssColumns'))
      },
    }
  }
})

const CustomOrderedList = OrderedListExtension.extend({
  addInputRules() {
    return []
  }
})

const WysiwygContent = ({ name, onChange, value, intlLabel, labelAction, disabled, error, description, required, settings }) => {
  const { formatMessage } = useIntl();
  const [currentContent, setCurrentContent] = useState('');

  const editor = useEditor({
    extensions: [
      // Text
      DocumentExtension,
      ParagraphExtension,
      TextExtension,
      BoldExtension,
      StrikeExtension,
      ItalicExtension,
      GapcursorExtension,
      ListItemExtension,
      BulletListExtension,
      HeadingExtension,
      TOCExtension,
      BubbleMenu.configure({
        element: document.querySelector('.menu'),
      }),

      settings.disableOrderedListShorthand ? CustomOrderedList : OrderedListExtension,
      settings.code ? CodeBlockExtension : null,
      settings.code ? CodeExtension : null,
      settings.blockquote ? BlockquoteExtension : null,
      settings.horizontal ? HorizontalRuleExtension : null,
      settings.hardbreak ? HardBreakExtension : null,

      UnderlineExtension,
      TextAlignExtension.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyleExtension,
      settings.color ? ColorExtension : null,
      settings.highlight ? HighlightExtension.configure({ multicolor: true }) : null,
      // Links
      settings.links.enabled ? LinkExtension.configure({
        autolink: settings.links.autolink,
        openOnClick: settings.links.openOnClick,
        linkOnPaste: settings.links.linkOnPaste,
        HTMLAttributes: {
          rel: settings.links.HTMLAttributes.rel
        }
      }) : null,

      // Images
      settings.image.enabled ? ImageExtension.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: { default: null },
            height: { default: null },
            loading: { default: null },
            renderHTML: (attributes) => {
              return {
                width: attributes.width,
                height: attributes.height,
                loading: attributes.loading
              };
            }
          };
        }
      }).configure({
        inline: settings.image.inline,
        allowBase64: settings.image.allowBase64,
      }) : null,

      // Table
      settings.table ? TableExtension.configure({
        allowTableNodeSelection: true,
      }) : null,
      settings.table ? TableRowExtension : null,
      settings.table ? TableCellExtension : null,
      settings.table ? TableHeaderExtension : null,

      settings.other && settings.other.wordcount ? CharacterCountExtension.configure() : null,

      // CSS Columns
      CSSColumnsExtension.configure({
        types: ['paragraph']
      }),

      settings.youtube.enabled ? YouTubeExtension.configure({
        inline: false,
      }) : null,
      History
    ],
    parseOptions: {
      preserveWhitespace: 'full',
    },
    onUpdate(ctx) {
      if (settings.other.saveJson) {
        onChange({ target: { name, value: JSON.stringify(ctx.editor.getJSON()) } })
      } else {
        onChange({ target: { name, value: ctx.editor.getHTML() } })
      }


    },
  })

  useEffect(() => {
    if (editor === null) return
    if (currentContent === '') {
      // Content can be 2 things: JSON or String. Be able to display both things.

      try {
        // If content is saved as json, parse it
        const json = JSON.parse(value)
        setCurrentContent(value)
        editor.commands.setContent(json, false)
      } catch (e) {
        // Use value as is, the content hasn't been converted to json.
        setCurrentContent(value)
        editor.commands.setContent(value, false)
      }
    }
  }, [editor])

  return (
    <Field required={required}>
      <Stack spacing={1}>
        <Box>
          <FieldLabel action={labelAction}> {formatMessage(intlLabel)}</FieldLabel>
        </Box>
        {editor &&
          <Editor
            key="editor"
            disabled={disabled}
            name={name}
            editor={editor}
            onChange={onChange}
            value={value}
            settings={settings}
          />
        }
        {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
          >
            bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
          >
            italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
          >
            strike
          </button>
        </BubbleMenu>}

        {error &&
          <Typography variant="pi" textColor="danger600">
            {formatMessage({ id: error, defaultMessage: error })}
          </Typography>
        }
        {description &&
          <Typography variant="pi">
            {formatMessage(description)}
          </Typography>
        }
      </Stack>
    </Field>
  )
}

Wysiwyg.defaultProps = {
  description: '',
  disabled: false,
  error: undefined,
  intlLabel: '',
  required: false,
  value: '',
  settings: {}
};

Wysiwyg.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  labelAction: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  settings: PropTypes.object
};

export default Wysiwyg;
