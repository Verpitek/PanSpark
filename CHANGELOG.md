# Changelog

All notable changes to PanSpark will be documented in this file.

## [0.5.0] - 2025-11-09

### Added

- **Struct Support**: New data type system for organizing related data
  - `STRUCT` - Define custom data types with typed fields (number, string, list)
  - `STRUCTEND` - Mark end of struct definition
  - `STRUCT_GET` - Retrieve field values from struct instances
  - `STRUCT_SET` - Set field values in struct instances with type validation
  - Dot notation access for struct fields (e.g., `person.name`)
  - Auto-initialization and type checking

- **QR Code Compression**: Encode programs to QR-friendly format
  - `encodeForQR()` - Compress code to base64-encoded format
  - `decodeFromQR()` - Decompress QR data back to executable code
  - `decodeQRToInstructions()` - One-step decode and compile
  - `getCompressionStats()` - Get compression metrics
  - Automatic comment removal and opcode abbreviation
  - Lossless compression preserving semantics

### Fixed

- Fixed QR code compression to properly preserve statement boundaries
- Fixed tokenizer to handle both newline and space-separated statements

### Improved

- Enhanced `compressCode()` to intelligently detect statement boundaries by opcode recognition
- Better statement separation using semicolon markers during compression

## [0.4.1] - 2025-11-08

### Added

- Error output to buffer (errors no longer throw, they're captured)

## [0.4.0] - 2025-11-08

### Added

- Version bump and documentation updates
- Memory statistics functionality (`MEMSTATS`)

### Changed

- Removed humorous error messages for consistency

## [0.3.0] - Earlier Versions

- Initial implementation of PanSpark scripting language
- Core opcodes: SET, MATH, PRINT, IF, JUMP, POINT, PROC, CALL, FOR, ENDFOR
- List operations: LIST_CREATE, LIST_PUSH, LIST_GET, LIST_SET, LIST_SORT
- String operations: CONCAT, STRLEN, SUBSTR, STR_UPPER, STR_LOWER, STR_TRIM, STR_REPLACE, STR_CONTAINS, STR_CHAR
- Type introspection: TYPEOF
- Error handling: TRY-CATCH, THROW
- Logical operators: AND, OR, NOT
- Memory management: FREE, MEMDUMP
- State persistence: saveState(), loadState()
