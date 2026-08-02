function fieldInputType(type) {
  if (type === "number") return "number";
  if (type === "date") return "date";
  return "text";
}

function fieldKey(field) {
  return field.id || field.label;
}

function fieldOptions(field) {
  if (Array.isArray(field.options)) {
    return field.options.map((option) => String(option).trim()).filter(Boolean);
  }
  if (typeof field.options === "string") {
    return field.options.split(",").map((option) => option.trim()).filter(Boolean);
  }
  return [];
}

function CustomFormFields({
  fields = [],
  values = {},
  onChange,
  fieldClassName = "",
  fullClassName = "full",
}) {
  if (!fields.length) return null;

  return fields.map((field) => {
    const key = fieldKey(field);
    const label = `${field.label}${field.required ? " *" : ""}`;
    const value = values?.[key] ?? "";
    const placeholder = field.placeholder || field.label;
    const options = fieldOptions(field);

    return (
      <label className={`${fieldClassName} ${fullClassName}`.trim()} key={key}>
        <span>{label}</span>
        {field.type === "dropdown" ? (
          <select
            value={value}
            onChange={(event) => onChange(key, event.target.value)}
            required={Boolean(field.required)}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={fieldInputType(field.type)}
            value={value}
            onChange={(event) => onChange(key, event.target.value)}
            placeholder={placeholder}
            required={Boolean(field.required)}
          />
        )}
      </label>
    );
  });
}

export default CustomFormFields;
