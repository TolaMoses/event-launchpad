<script lang="ts">
    export let src: string;
    export let alt = "";
    export let size: number | "sm" | "md" | "lg" = "md";
    export let className = "";

    const sizes = {
        sm: "16px",
        md: "20px",
        lg: "24px",
    };

    $: resolvedSize = typeof size === "number" ? `${size}px` : sizes[size];
</script>

<img
    {src}
    {alt}
    class="icon {className}"
    style="width: {resolvedSize}; height: {resolvedSize};"
/>

<style>
    .icon {
        display: inline-block;
        vertical-align: middle;
        object-fit: contain;
    }
</style>
