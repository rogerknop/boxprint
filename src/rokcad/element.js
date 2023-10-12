class Element {
    #object;

    // ********************************************************************************************
    // Constructor
    constructor(object) {
        this.#object = object;
    }

    // ********************************************************************************************
    // Render element
    render() {
        return this.#object;
    }
}

module.exports = Element;
