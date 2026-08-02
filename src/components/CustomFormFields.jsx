function fieldInputType(type) {
  if (type === "number") return "number";
  if (type === "date") return "date";
  return "text";
}

function fieldKey(field) {
  return field.id || field.label;
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

    return (
      <label className={`${fieldClassName} ${fullClassName}`.trim()} key={key}>
        <span>{label}</span>
        <input
          type={fieldInputType(field.type)}
          value={value}
          onChange={(event) => onChange(key, event.target.value)}
          placeholder={field.placeholder || field.label}
        />
      </label>
    );
  });
}

export default CustomFormFields;
