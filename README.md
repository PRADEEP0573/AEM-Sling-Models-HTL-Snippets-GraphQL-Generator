# AEM Sling Models + HTL Snippets + GraphQL Generator

A powerful VS Code extension that supercharges **Adobe Experience Manager** development with intelligent code generation for Sling Models, HTL snippets, and GraphQL types. Streamline your workflow and follow best practices with just a few clicks.

<div align="right">
<a href="https://www.buymeacoffee.com/FilesCompareMaster"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=😍&slug=FilesCompareMaster&button_colour=BD5FFF&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00" width="150" title="Buy me a coffee"></a>
</div>

---

## ✨ Features

- 🚀 **Sling Model Generation** – Create production-ready Sling Models with various injection types
- 💡 **HTL Snippets** – Boost productivity with comprehensive HTL code completions
- ❄️ **GraphQL Support** – Generate GraphQL type definitions with example queries
- 🔥 **Multiple Templates** – Choose from different Sling Model types (Component, Request, Exporter, etc.)
- ⚡ **Smart Code Generation** – Automatic imports, proper annotations, and best practices

---

## 📦 Installation

1. Open **Visual Studio Code**
2. Go to Extensions view (`Ctrl+Shift+X`)
3. Search for `"AEM Sling Models + HTL Snippets + GraphQL Generator"`
4. Click **Install**

---

## 🚀 Usage

### Generate a Sling Model

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
2. Type: `Generate Sling Model`
3. Follow the prompts to configure your model

![Usage Demo](images/Sling.gif)

### Generate a GraphQL Type

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
2. Type: `Generate GraphQL Model`
3. Enter your query name and configure as needed

![Usage Demo](images/graphql.gif)

### HTL Snippets

Start typing any HTL data-sly attribute and get intelligent code completion suggestions.

---

## 🛠 Supported Sling Model Features

### Injection Types *(Annotations)*

- `@ValueMapValue` - Inject properties from ValueMap
- `@Inject` - General dependency injection
- `@OSGiService` - Inject OSGi services
- `@ChildResource` - Access child resources
- `@RequestAttribute` - Access request attributes
- `@ScriptVariable` - Access script variables
- `@Self` - Inject the adaptable object
- `@PostConstruct` - Post-construction callback
- `@PreDestroy` - Pre-destruction callback
- `@Via` - Inject with resource type resolution
- `@Named` - Inject with OSGi service name
- `@Default` - Inject with default value
- `@Optional` - Inject with optional value

### Field Types

- Primitives (String, int, long, double, boolean)
- Resource and Sling objects (Resource, ResourceResolver, Session)
- Request/Response objects (SlingHttpServletRequest, SlingHttpServletResponse)
- AEM-specific (Component, Page, Design, Style)

---

## 📝 Example Sling Model

```java
@Model(adaptables = Resource.class)
public class MyComponent {
    @ValueMapValue
    private String title;
  
    @OSGiService
    private ModelFactory modelFactory;
  
    @PostConstruct
    protected void init() {
        // Initialization code here
    }
}
```

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions, issues, or ideas, feel free to open an issue or submit a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 About the Author

<p align="center">
  <img src="images/vscode.jpeg" width="120" style="border-radius: 50%" alt="Pradeep Sapparapu"><br><br>
  <strong>Pradeep Sapparapu</strong><br>
  <i>"I created this tool to make AEM development faster and more efficient. It's 100% free and open-source — share it with your team!"</i><br><br>
  <i>Made with ❤️ in Andhra Pradesh, India 🇮🇳</i><br>
  🔗 <a href="https://github.com/PRADEEP0573/AEM-Sling-Models-HTL-Snippets-GraphQL-Generator">GitHub</a> • 
  📧 <a href="mailto:pradeepdeep057@gmail.com">Email Me</a>  
</p>

---

## 🙏 Support

If you find this tool helpful, please ⭐ star the repository and share it with your team!
You can also [follow me on GitHub](https://github.com/PRADEEP0573/AEM-Sling-Models-HTL-Snippets-GraphQL-Generator) for more AEM tools and updates.

<div style="text-align: center; margin: 20px 0;">
<a href="https://www.buymeacoffee.com/FilesCompareMaster"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=😍&slug=FilesCompareMaster&button_colour=BD5FFF&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00" width="200" title="Buy me a coffee"></a>
</div>

---

<div style="text-align: center; margin: 20px 0;">© 2025 Padde Software. All rights reserved.</div>
